import fs from "fs/promises";
import path from "path";
import { Subject } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ParsedVariant, parseDocxFile } from "../lib/docx-parser";

type SubjectKey = "java" | "arduino";

const JAVA_ANSWER_KEYS: Record<number, string[]> = {
  1: [
    "C", "C", "E", "E", "C", "B", "D", "B", "D", "B", "B", "C", "E", "E", "C", "E", "E", "A", "C", "A",
    "C", "E", "C", "A", "A", "A", "C", "A", "E", "D", "C", "D", "C", "A", "D", "C", "B", "A", "D", "C"
  ],
  2: [
    "B", "A", "A", "E", "D", "B", "C", "E", "B", "E", "C", "D", "B", "A", "E", "B", "D", "D", "C", "E",
    "C", "B", "B", "C", "A", "B", "D", "B", "D", "C", "A", "B", "C", "C", "A", "D", "C", "E", "D", "B"
  ],
  3: [
    "C", "A", "B", "B", "D", "D", "B", "B", "D", "C", "B", "D", "D", "E", "A", "E", "D", "A", "E", "C",
    "E", "D", "A", "B", "A", "B", "C", "D", "A", "B", "C", "D", "A", "E", "B", "B", "B", "A", "C", "B"
  ],
  4: [
    "E", "E", "D", "D", "E", "A", "D", "D", "E", "A", "C", "B", "A", "C", "B", "E", "A", "A", "D", "A",
    "A", "B", "D", "E", "D", "A", "B", "B", "D", "C", "D", "E", "E", "C", "A", "D", "C", "E", "C", "A"
  ],
  5: [
    "E", "B", "E", "A", "E", "A", "B", "A", "A", "C", "E", "A", "A", "B", "D", "D", "A", "D", "B", "C",
    "C", "D", "D", "A", "B", "D", "A", "C", "E", "C", "B", "D", "A", "B", "A", "C", "B", "D", "C", "E"
  ],
  6: [
    "A", "E", "D", "E", "B", "E", "D", "C", "C", "A", "C", "D", "D", "A", "C", "D", "A", "C", "A", "E",
    "E", "D", "B", "E", "D", "C", "D", "E", "D", "E", "C", "A", "D", "D", "E", "E", "E", "B", "B", "D"
  ],
  7: [
    "A", "B", "B", "D", "E", "B", "C", "C", "D", "D", "C", "C", "E", "E", "A", "B", "D", "C", "D", "D",
    "D", "B", "A", "B", "C", "C", "E", "B", "A", "C", "E", "B", "E", "D", "E", "E", "D", "B", "A", "B"
  ],
  8: [
    "B", "C", "C", "B", "C", "D", "E", "E", "A", "E", "E", "C", "B", "A", "A", "B", "E", "C", "C", "E",
    "A", "C", "A", "D", "D", "A", "B", "C", "C", "A", "C", "E", "E", "C", "B", "B", "E", "C", "E", "B"
  ],
  9: [
    "A", "C", "E", "D", "B", "D", "E", "B", "E", "A", "E", "D", "B", "B", "A", "B", "A", "D", "E", "A",
    "E", "A", "B", "B", "B", "C", "A", "A", "E", "C", "D", "D", "C", "A", "A", "B", "C", "A", "B", "A"
  ]
};

const ARDUINO_ANSWER_KEYS: Record<number, string[]> = {
  1: [
    "E", "D", "E", "C", "C", "E", "D", "D", "A", "A", "A", "C", "C", "C", "B", "E", "A", "B", "C", "B",
    "E", "B", "C", "A", "E", "D", "E", "D", "A", "A", "D", "C", "B", "A", "A", "E", "E", "D", "E", "E"
  ],
  2: [
    "E", "C", "E", "C", "C", "D", "C", "B", "E", "A", "B", "B", "B", "D", "E", "D", "C", "A", "A", "B",
    "A", "E", "A", "D", "E", "E", "A", "B", "D", "A", "B", "A", "C", "E", "E", "C", "A", "E", "E", "B"
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
    "A", "E", "A", "D", "E", "E", "A", "B", "D", "A", "B", "A", "C", "E", "E", "C", "A", "E", "E", "B",
    "E", "D", "C", "D", "B", "C", "B", "E", "E", "C", "E", "C", "C", "D", "C", "B", "E", "A", "B", "B"
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
    "C", "C", "B", "E", "A", "B", "C", "B", "E", "B", "C", "A", "E", "D", "E", "D", "A", "A", "D", "C"
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
  answerKeys: Record<number, string[]>,
  subjectName: string
): ParsedVariant[] {
  return variants.map((variant) => {
    const answers = answerKeys[variant.variantNumber];
    if (!answers) {
      throw new Error(`Missing answer key for ${subjectName} variant ${variant.variantNumber}`);
    }

    if (answers.length !== variant.questions.length) {
      throw new Error(
        `Answer key length mismatch for ${subjectName} variant ${variant.variantNumber}: expected ${variant.questions.length}, got ${answers.length}`
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
            `${subjectName} key mismatch at variant ${variant.variantNumber}, question ${question.order}. Correct label ${correctLabel} not found`
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

function normalizeQuestionForConsistencyCheck(questionText: string): string {
  return questionText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function normalizeOptionForConsistencyCheck(optionText: string): string {
  return optionText.toLowerCase().replace(/\s+/g, " ").trim();
}

function assertConsistentArduinoAnswers(variants: ParsedVariant[]): void {
  const grouped = new Map<
    string,
    Array<{ variantNumber: number; order: number; questionText: string; correctText: string }>
  >();

  for (const variant of variants) {
    for (const question of variant.questions) {
      const key = normalizeQuestionForConsistencyCheck(question.text);
      const correctOption = question.options.find((option) => option.isCorrect);

      if (!correctOption) {
        continue;
      }

      const entry = {
        variantNumber: variant.variantNumber,
        order: question.order,
        questionText: question.text,
        correctText: normalizeOptionForConsistencyCheck(correctOption.text)
      };

      if (!grouped.has(key)) {
        grouped.set(key, [entry]);
      } else {
        grouped.get(key)!.push(entry);
      }
    }
  }

  const conflicts: string[] = [];

  for (const entries of grouped.values()) {
    if (entries.length < 2) {
      continue;
    }

    const uniqueAnswers = [...new Set(entries.map((entry) => entry.correctText))];
    if (uniqueAnswers.length < 2) {
      continue;
    }

    const sample = entries
      .map((entry) => `V${entry.variantNumber}Q${entry.order}: ${entry.correctText}`)
      .join(", ");
    conflicts.push(`${entries[0].questionText} -> ${sample}`);
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Arduino answer consistency check failed (${conflicts.length} conflict(s)): ${conflicts.join(
        " | "
      )}`
    );
  }
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

  const javaVariantsRaw = await parseDocxFile(javaDocxPath);
  const javaVariants = applyAnswerKeys(javaVariantsRaw, JAVA_ANSWER_KEYS, "Java");
  const arduinoVariantsRaw = await parseDocxFile(arduinoDocxPath);
  const arduinoVariants = applyAnswerKeys(arduinoVariantsRaw, ARDUINO_ANSWER_KEYS, "Arduino");
  assertConsistentArduinoAnswers(arduinoVariants);

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
