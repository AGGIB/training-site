export const dynamic = "force-dynamic";
import { AttemptMode, Subject } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { dedupeQuestionsByFingerprint, selectUniqueQuestions } from "@/lib/quiz-selection";
import { quizStartSchema } from "@/lib/validators";

const QUESTION_LIMIT = 40;

function toDbSubject(subject: "java" | "arduino"): Subject {
  return subject === "java" ? Subject.JAVA : Subject.ARDUINO;
}

function fromDbSubject(subject: Subject): "java" | "arduino" {
  return subject === Subject.JAVA ? "java" : "arduino";
}

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

    const subject = toDbSubject(parsed.data.subject);

    let questions:
      | Array<{
          id: string;
          text: string;
          order: number;
          variantNumber: number;
          options: Array<{ id: string; label: string; text: string; order: number }>;
        }>
      | null = null;

    if (parsed.data.mode === "variant") {
      if (!parsed.data.variantNumber) {
        return badRequest("variantNumber is required for variant mode");
      }

      const dbRows = await prisma.question.findMany({
        where: {
          subject,
          variant: {
            subject,
            number: parsed.data.variantNumber
          }
        },
        include: {
          variant: {
            select: {
              number: true
            }
          },
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

      const uniqueRows = dedupeQuestionsByFingerprint(dbRows);

      questions = uniqueRows.map((row) => ({
        id: row.id,
        text: row.text,
        order: row.order,
        variantNumber: row.variant.number,
        options: row.options
      }));
    } else {
      const dbRows = await prisma.question.findMany({
        where: {
          subject
        },
        include: {
          variant: {
            select: {
              number: true
            }
          },
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

      questions = selectUniqueQuestions(dbRows, QUESTION_LIMIT)
        .map((row) => ({
          id: row.id,
          text: row.text,
          order: row.order,
          variantNumber: row.variant.number,
          options: row.options
        }));
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Question bank is empty" }, { status: 404 });
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        mode: parsed.data.mode === "variant" ? AttemptMode.VARIANT : AttemptMode.MIXED,
        subject,
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
        subject: fromDbSubject(attempt.subject),
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
