export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const totalAttempts = await prisma.attempt.count({
      where: {
        userId: user.id,
        finishedAt: { not: null }
      }
    });

    const totalAnswered = await prisma.attemptAnswer.count({
      where: {
        attempt: {
          userId: user.id
        }
      }
    });

    const totalCorrect = await prisma.attemptAnswer.count({
      where: {
        attempt: {
          userId: user.id
        },
        isCorrect: true
      }
    });

    const activeMistakes = await prisma.userQuestionProgress.count({
      where: {
        userId: user.id,
        isActive: true
      }
    });

    const answerRows = await prisma.attemptAnswer.findMany({
      where: {
        attempt: {
          userId: user.id
        }
      },
      select: {
        isCorrect: true,
        question: {
          select: {
            variantId: true
          }
        }
      }
    });

    const variantStatsMap = new Map<
      number,
      { variant: number; total: number; correct: number; accuracy: number }
    >();

    for (let variant = 1; variant <= 9; variant += 1) {
      variantStatsMap.set(variant, {
        variant,
        total: 0,
        correct: 0,
        accuracy: 0
      });
    }

    for (const answerRow of answerRows) {
      const variantRow = variantStatsMap.get(answerRow.question.variantId);
      if (!variantRow) {
        continue;
      }

      variantRow.total += 1;
      if (answerRow.isCorrect) {
        variantRow.correct += 1;
      }
    }

    const variantStats = [...variantStatsMap.values()].map((row) => ({
      ...row,
      accuracy: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
    }));

    const recentAttempts = await prisma.attempt.findMany({
      where: {
        userId: user.id,
        finishedAt: {
          not: null
        }
      },
      orderBy: {
        startedAt: "desc"
      },
      take: 12,
      select: {
        id: true,
        mode: true,
        variantNumber: true,
        startedAt: true,
        finishedAt: true,
        totalQuestions: true,
        correctCount: true,
        elapsedSec: true
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username
      },
      stats: {
        totalAttempts,
        totalAnswered,
        totalCorrect,
        accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
        activeMistakes,
        variantStats,
        recentAttempts
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
