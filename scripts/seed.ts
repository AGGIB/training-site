import fs from "fs/promises";
import path from "path";
import { Subject } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ParsedVariant, parseDocxFile } from "../lib/docx-parser";

type SubjectKey = "java" | "arduino";

const ARDUINO_ANSWER_KEYS: Record<number, string[]> = {
  1: [
    "E", "D", "E", "C", "C", "E", "D", "D", "A", "A", "A", "C", "C", "C", "B", "E", "A", "B", "C", "B",
    "C", "B", "C", "A", "E", "D", "E", "D", "A", "A", "D", "C", "B", "A", "A", "E", "E", "D", "E", "E"
  ],
  2: [
    "E", "C", "E", "C", "C", "D", "C", "B", "E", "A", "B", "B", "B", "D", "E", "D", "C", "A", "A", "B",
    "A", "E", "A", "D", "E", "E", "A", "B", "D", "A", "B", "A", "C", "E", "A", "C", "A", "E", "E", "B"
  ],
  3: [
    "A", "C", "C", "C", "B", "E", "A", "B", "C", "B", "E", "B", "C", "A", "E", "D", "E", "D", "A", "A",
    "D", "C", "B", "A", "A", "E", "E", "D", "E", "E", "D", "C", "C", "D", "A", "E", "B", "C", "E", "D"
  ],
  4: [
    "B", "B", "B", "D", "E", "D", "C", "A", "A", "B", "A", "E", "A", "D", "E", "E", "A", "B", "D", "A",
    "B", "A", "C", "E", "E", "C", "A", "E", "E", "B", "E", "D", "C", "D", "B", "C", "B", "E", "E", "C"
  ],
  5: [
    "E", "B", "C", "A", "E", "D", "E", "D", "A", "A", "D", "C", "B", "A", "A", "E", "E", "D", "E", "E",
    "D", "C", "C", "D", "A", "E", "B", "C", "E", "D", "E", "C", "C", "E", "D", "D", "A", "A", "A", "C"
  ],
  6: [
    "A", "B", "A", "D", "E", "E", "A", "B", "D", "A", "B", "A", "C", "E", "E", "C", "A", "E", "E", "B",
    "E", "D", "C", "D", "B", "C", "B", "E", "E", "B", "E", "C", "C", "D", "C", "B", "E", "A", "B", "B"
  ],
  7: [
    "D", "C", "B", "A", "A", "E", "E", "D", "E", "E", "D", "C", "C", "D", "A", "E", "B", "C", "E", "D",
    "E", "C", "C", "E", "D", "D", "A", "A", "A", "C", "C", "C", "B", "E", "A", "B", "C", "B", "E", "B"
  ],
  8: [
    "B", "A", "C", "E", "E", "C", "A", "E", "E", "B", "E", "D", "C", "D", "B", "C", "B", "E", "E", "C",
    "E", "C", "C", "D", "C", "B", "E", "A", "B", "B", "B", "D", "E", "D", "C", "A", "A", "B", "A", "E"
  ],
  9: [
    "D", "C", "C", "D", "A", "E", "B", "C", "E", "D", "E", "C", "C", "E", "D", "D", "A", "A", "A", "C",
    "C", "C", "B", "E", "A", "B", "C", "B", "E", "B", "C", "A", "E", "E", "E", "D", "A", "A", "D", "E"
  ]
};

function normalizeLetter(raw: string): string {
  const cleaned = raw.trim().toUpperCase();

  const map: Record<string, string> = {
    А: "A",
    В: "B",
    С: "C",
    Д: "D",
    Е: "E"
  };

  return map[cleaned] ?? cleaned;
}

function mapSubjectKeyToDb(subject: SubjectKey): Subject {
  return subject === "java" ? Subject.JAVA : Subject.ARDUINO;
}

function variantIdFor(subject: Subject, variantNumber: number): number {
  return subject === Subject.JAVA ? variantNumber : 100 + variantNumber;
}

function applyAnswerKeys(
  variants: ParsedVariant[],
  answerKeys: Record<number, string[]>
): ParsedVariant[] {
  return variants.map((variant) => {
    const answers = answerKeys[variant.variantNumber];
    if (!answers) {
      throw new Error(`Missing answer key for Arduino variant ${variant.variantNumber}`);
    }

    if (answers.length !== variant.questions.length) {
      throw new Error(
        `Answer key length mismatch for Arduino variant ${variant.variantNumber}: expected ${variant.questions.length}, got ${answers.length}`
      );
    }

    return {
      ...variant,
      questions: variant.questions.map((question, index) => {
        const correctLabel = normalizeLetter(answers[index]);

        const hasCorrect = question.options.some(
          (option) => normalizeLetter(option.label) === correctLabel
        );

        if (!hasCorrect) {
          throw new Error(
            `Arduino key mismatch at variant ${variant.variantNumber}, question ${question.order}. Correct label ${correctLabel} not found`
          );
        }

        return {
          ...question,
          options: question.options.map((option) => ({
            ...option,
            isCorrect: normalizeLetter(option.label) === correctLabel
          }))
        };
      })
    };
  });
}

async function importSubject(subjectKey: SubjectKey, variants: ParsedVariant[]) {
  const subject = mapSubjectKeyToDb(subjectKey);

  for (const variant of variants) {
    const variantId = variantIdFor(subject, variant.variantNumber);

    await prisma.variant.upsert({
      where: { id: variantId },
      create: {
        id: variantId,
        subject,
        number: variant.variantNumber,
        title: `${subjectKey.toUpperCase()} · Вариант №${variant.variantNumber}`
      },
      update: {
        subject,
        number: variant.variantNumber,
        title: `${subjectKey.toUpperCase()} · Вариант №${variant.variantNumber}`
      }
    });

    for (const question of variant.questions) {
      const questionRecord = await prisma.question.upsert({
        where: {
          variantId_order: {
            variantId,
            order: question.order
          }
        },
        create: {
          variantId,
          subject,
          order: question.order,
          text: question.text
        },
        update: {
          subject,
          text: question.text
        }
      });

      for (const option of question.options) {
        await prisma.option.upsert({
          where: {
            questionId_label: {
              questionId: questionRecord.id,
              label: normalizeLetter(option.label)
            }
          },
          create: {
            questionId: questionRecord.id,
            label: normalizeLetter(option.label),
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order
          },
          update: {
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order
          }
        });
      }
    }
  }
}

async function main() {
  const javaDocxPath = process.env.SEED_DOCX_PATH
    ? path.resolve(process.cwd(), process.env.SEED_DOCX_PATH)
    : path.resolve(process.cwd(), "data/questions.docx");

  const arduinoDocxPath = process.env.SEED_DOCX_ARDUINO_PATH
    ? path.resolve(process.cwd(), process.env.SEED_DOCX_ARDUINO_PATH)
    : path.resolve(process.cwd(), "data/arduino.docx");

  const javaVariants = await parseDocxFile(javaDocxPath);
  const arduinoVariantsRaw = await parseDocxFile(arduinoDocxPath);
  const arduinoVariants = applyAnswerKeys(arduinoVariantsRaw, ARDUINO_ANSWER_KEYS);

  if (javaVariants.length === 0 || arduinoVariants.length === 0) {
    throw new Error("One of subjects has empty parsed variants");
  }

  const outputPath = path.resolve(process.cwd(), "data/questions.json");
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        java: javaVariants,
        arduino: arduinoVariants
      },
      null,
      2
    ),
    "utf-8"
  );

  await importSubject("java", javaVariants);
  await importSubject("arduino", arduinoVariants);

  const javaSummary = javaVariants
    .map((variant) => `#${variant.variantNumber}: ${variant.questions.length}`)
    .join(", ");
  const arduinoSummary = arduinoVariants
    .map((variant) => `#${variant.variantNumber}: ${variant.questions.length}`)
    .join(", ");

  console.log(`Seed completed. Java: ${javaSummary}`);
  console.log(`Seed completed. Arduino: ${arduinoSummary}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
