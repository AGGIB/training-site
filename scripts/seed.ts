import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { parseDocxFile } from "../lib/docx-parser";

async function main() {
  const docxPath = process.env.SEED_DOCX_PATH
    ? path.resolve(process.cwd(), process.env.SEED_DOCX_PATH)
    : path.resolve(process.cwd(), "data/questions.docx");

  const variants = await parseDocxFile(docxPath);

  if (variants.length === 0) {
    throw new Error("No variants parsed from DOCX");
  }

  const outputPath = path.resolve(process.cwd(), "data/questions.json");
  await fs.writeFile(outputPath, JSON.stringify(variants, null, 2), "utf-8");

  for (const variant of variants) {
    await prisma.variant.upsert({
      where: { id: variant.variantNumber },
      create: {
        id: variant.variantNumber,
        title: variant.title
      },
      update: {
        title: variant.title
      }
    });

    for (const question of variant.questions) {
      const questionRecord = await prisma.question.upsert({
        where: {
          variantId_order: {
            variantId: variant.variantNumber,
            order: question.order
          }
        },
        create: {
          variantId: variant.variantNumber,
          order: question.order,
          text: question.text
        },
        update: {
          text: question.text
        }
      });

      for (const option of question.options) {
        await prisma.option.upsert({
          where: {
            questionId_label: {
              questionId: questionRecord.id,
              label: option.label
            }
          },
          create: {
            questionId: questionRecord.id,
            label: option.label,
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

  const summary = variants
    .map((variant) => `#${variant.variantNumber}: ${variant.questions.length}`)
    .join(", ");

  console.log(`Seed completed. Variants: ${variants.length}. Questions: ${summary}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
