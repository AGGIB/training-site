import { z } from "zod";

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[\p{L}\p{N}_-]+$/u),
  password: z.string().min(4).max(64)
});

export const quizStartSchema = z.object({
  subject: z.enum(["java", "arduino"]).default("java"),
  mode: z.enum(["variant", "mixed"]),
  variantNumber: z.number().int().min(1).max(9).optional()
});

export const quizAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  optionId: z.string().min(1)
});

export const quizFinishSchema = z.object({
  attemptId: z.string().min(1),
  elapsedSec: z.number().int().min(0).max(24 * 60 * 60).optional()
});

export const mistakesAnswerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1)
});
