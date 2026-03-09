import { Prisma, PrismaClient } from "@prisma/client";
import { applyProgressResult } from "./mistake-logic";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function applyQuestionResult(
  db: DbClient,
  userId: string,
  questionId: string,
  isCorrect: boolean
) {
  const existing = await db.userQuestionProgress.findUnique({
    where: { userId_questionId: { userId, questionId } }
  });

  const nextState = applyProgressResult(existing, isCorrect);

  if (!existing) {
    return db.userQuestionProgress.create({
      data: {
        userId,
        questionId,
        streak: nextState.streak,
        isActive: nextState.isActive,
        timesWrong: nextState.timesWrong,
        timesCorrect: nextState.timesCorrect
      }
    });
  }

  return db.userQuestionProgress.update({
    where: { userId_questionId: { userId, questionId } },
    data: {
      streak: nextState.streak,
      isActive: nextState.isActive,
      timesWrong: nextState.timesWrong,
      timesCorrect: nextState.timesCorrect
    }
  });
}
