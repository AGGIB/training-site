export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { badRequest, serverError } from "@/lib/http";
import { applyQuestionResult } from "@/lib/progress";
import { prisma } from "@/lib/prisma";
import { mistakesAnswerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const payload = await req.json();
    const parsed = mistakesAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    const { questionId, optionId } = parsed.data;

    const progress = await prisma.userQuestionProgress.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId
        }
      }
    });

    if (!progress || !progress.isActive) {
      return NextResponse.json(
        { error: "Question is not active in mistakes queue" },
        { status: 404 }
      );
    }

    const selectedOption = await prisma.option.findUnique({
      where: {
        id: optionId
      },
      select: {
        id: true,
        label: true,
        questionId: true,
        isCorrect: true
      }
    });

    if (!selectedOption || selectedOption.questionId !== questionId) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }

    const correctOption = await prisma.option.findFirst({
      where: {
        questionId,
        isCorrect: true
      },
      select: {
        id: true,
        label: true
      }
    });

    if (!correctOption) {
      return NextResponse.json(
        { error: "No correct option configured for question" },
        { status: 500 }
      );
    }

    const isCorrect = selectedOption.isCorrect;

    const updatedProgress = await prisma.$transaction(async (tx) => {
      const nextProgress = await applyQuestionResult(tx, user.id, questionId, isCorrect);

      await tx.mistakeAnswer.create({
        data: {
          userProgressId: nextProgress.id,
          selectedOptionId: selectedOption.id,
          isCorrect
        }
      });

      return nextProgress;
    });

    return NextResponse.json({
      isCorrect,
      correctOptionLabel: correctOption.label,
      streak: updatedProgress.streak,
      isActive: updatedProgress.isActive,
      timesWrong: updatedProgress.timesWrong,
      timesCorrect: updatedProgress.timesCorrect
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
