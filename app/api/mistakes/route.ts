export const dynamic = "force-dynamic";
import { Subject } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function toDbSubject(subject: string | null): Subject {
  return subject === "arduino" ? Subject.ARDUINO : Subject.JAVA;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return unauthorized();
    }

    const selectedSubject = toDbSubject(req.nextUrl.searchParams.get("subject"));

    const rows = await prisma.userQuestionProgress.findMany({
      where: {
        userId: user.id,
        isActive: true,
        question: {
          subject: selectedSubject
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        question: {
          include: {
            variant: {
              select: {
                number: true
              }
            },
            options: {
              orderBy: {
                order: "asc"
              },
              select: {
                id: true,
                label: true,
                text: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      count: rows.length,
      questions: rows.map((row) => ({
        questionId: row.questionId,
        text: row.question.text,
        variantId: row.question.variant.number,
        order: row.question.order,
        streak: row.streak,
        timesWrong: row.timesWrong,
        options: row.question.options
      }))
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
