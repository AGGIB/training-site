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

    const rows = await prisma.userQuestionProgress.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        question: {
          include: {
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
        variantId: row.question.variantId,
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
