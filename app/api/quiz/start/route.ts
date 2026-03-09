export const dynamic = "force-dynamic";
import { AttemptMode } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { quizStartSchema } from "@/lib/validators";

const QUESTION_LIMIT = 40;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const payload = await req.json();
    const parsed = quizStartSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    let questions:
      | Array<{
          id: string;
          text: string;
          order: number;
          variantId: number;
          options: Array<{ id: string; label: string; text: string; order: number }>;
        }>
      | null = null;

    if (parsed.data.mode === "variant") {
      if (!parsed.data.variantNumber) {
        return badRequest("variantNumber is required for variant mode");
      }

      const dbRows = await prisma.question.findMany({
        where: {
          variantId: parsed.data.variantNumber
        },
        include: {
          options: {
            select: {
              id: true,
              label: true,
              text: true,
              order: true
            },
            orderBy: {
              order: "asc"
            }
          }
        },
        orderBy: {
          order: "asc"
        },
        take: QUESTION_LIMIT
      });

      questions = dbRows;
    } else {
      const randomQuestionIds = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Question"
        ORDER BY RANDOM()
        LIMIT ${QUESTION_LIMIT}
      `;

      const idOrder = new Map<string, number>();
      randomQuestionIds.forEach((row, index) => {
        idOrder.set(row.id, index);
      });

      const dbRows = await prisma.question.findMany({
        where: {
          id: {
            in: randomQuestionIds.map((row) => row.id)
          }
        },
        include: {
          options: {
            select: {
              id: true,
              label: true,
              text: true,
              order: true
            },
            orderBy: {
              order: "asc"
            }
          }
        }
      });

      questions = dbRows.sort((left, right) => {
        return (idOrder.get(left.id) ?? 0) - (idOrder.get(right.id) ?? 0);
      });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Question bank is empty" }, { status: 404 });
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        mode: parsed.data.mode === "variant" ? AttemptMode.VARIANT : AttemptMode.MIXED,
        variantNumber: parsed.data.mode === "variant" ? parsed.data.variantNumber : null,
        totalQuestions: questions.length,
        questions: {
          createMany: {
            data: questions.map((question, index) => ({
              questionId: question.id,
              order: index + 1
            }))
          }
        }
      }
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        mode: attempt.mode,
        variantNumber: attempt.variantNumber,
        totalQuestions: attempt.totalQuestions,
        startedAt: attempt.startedAt
      },
      questions
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
