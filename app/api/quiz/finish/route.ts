export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { quizFinishSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const payload = await req.json();
    const parsed = quizFinishSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    const attempt = await prisma.attempt.findFirst({
      where: {
        id: parsed.data.attemptId,
        userId: user.id
      },
      select: {
        id: true,
        totalQuestions: true,
        correctCount: true,
        finishedAt: true
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const answeredCount = await prisma.attemptAnswer.count({
      where: {
        attemptId: attempt.id
      }
    });

    const correctCount = await prisma.attemptAnswer.count({
      where: {
        attemptId: attempt.id,
        isCorrect: true
      }
    });

    if (!attempt.finishedAt) {
      await prisma.attempt.update({
        where: {
          id: attempt.id
        },
        data: {
          finishedAt: new Date(),
          elapsedSec: parsed.data.elapsedSec,
          correctCount
        }
      });
    }

    return NextResponse.json({
      totalQuestions: attempt.totalQuestions,
      answeredCount,
      correctCount,
      accuracy:
        attempt.totalQuestions > 0
          ? Math.round((correctCount / attempt.totalQuestions) * 100)
          : 0
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
