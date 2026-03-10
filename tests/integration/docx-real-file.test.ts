import path from "path";
import { parseDocxFile } from "@/lib/docx-parser";

describe("docx real file parsing", () => {
  it("parses variants and questions from bundled DOCX", async () => {
    const filePath = path.resolve(process.cwd(), "data/questions.docx");
    const variants = await parseDocxFile(filePath);

    expect(variants.length).toBe(9);

    const totalQuestions = variants.reduce(
      (sum, variant) => sum + variant.questions.length,
      0
    );

    expect(totalQuestions).toBeGreaterThanOrEqual(359);
    expect(totalQuestions).toBeLessThanOrEqual(360);

    for (const variant of variants) {
      expect(variant.questions.length).toBeGreaterThanOrEqual(39);
      expect(variant.questions.length).toBeLessThanOrEqual(40);
    }
  });

  it("parses Arduino DOCX with 9 variants", async () => {
    const filePath = path.resolve(process.cwd(), "data/arduino.docx");
    const variants = await parseDocxFile(filePath);

    expect(variants.length).toBe(9);
    for (const variant of variants) {
      expect(variant.questions.length).toBeGreaterThanOrEqual(39);
      expect(variant.questions.length).toBeLessThanOrEqual(40);
    }
  });
});
