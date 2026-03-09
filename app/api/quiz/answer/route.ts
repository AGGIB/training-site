export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { applyQuestionResult } from "@/lib/progress";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { quizAnswerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const payload = await req.json();
    const parsed = quizAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    const { attemptId, questionId, optionId } = parsed.data;

    const attempt = await prisma.attempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.finishedAt) {
      return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
    }

    const questionInAttempt = await prisma.attemptQuestion.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      }
    });

    if (!questionInAttempt) {
      return NextResponse.json(
        { error: "Question does not belong to this attempt" },
        { status: 400 }
      );
    }

    const existingAnswer = await prisma.attemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      }
    });

    if (existingAnswer) {
      return NextResponse.json({ error: "Question already answered" }, { status: 409 });
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

    const answeredCount = await prisma.$transaction(async (tx) => {
      await tx.attemptAnswer.create({
        data: {
          attemptId,
          questionId,
          selectedOptionId: selectedOption.id,
          isCorrect
        }
      });

      if (isCorrect) {
        await tx.attempt.update({
          where: { id: attemptId },
          data: {
            correctCount: {
              increment: 1
            }
          }
        });
      }

      await applyQuestionResult(tx, user.id, questionId, isCorrect);

      return tx.attemptAnswer.count({
        where: {
          attemptId
        }
      });
    });

    return NextResponse.json({
      isCorrect,
      selectedOptionLabel: selectedOption.label,
      correctOptionLabel: correctOption.label,
      correctOptionId: correctOption.id,
      answeredCount
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
