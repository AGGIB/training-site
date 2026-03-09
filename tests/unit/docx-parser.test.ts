import { parseDocumentXml } from "@/lib/docx-parser";

function getCorrectLabel(options: Array<{ label: string; isCorrect: boolean }>) {
  return options.find((option) => option.isCorrect)?.label;
}

describe("parseDocumentXml", () => {
  it("parses inline/split questions and bold answers", () => {
    const xml = `
<w:document>
  <w:body>
    <w:p><w:r><w:t>Вариант: №1</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>Q1?A) a1B) b1</w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>C) c1</w:t></w:r>
      <w:r><w:t>D) d1E) e1</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>Q2?</w:t></w:r></w:p>
    <w:p><w:r><w:t>A) a2B) b2C) c2</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>D) d2</w:t></w:r><w:r><w:t>E) e2</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>Q3?A) a3B) b3C) c3</w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>D) d3</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const variants = parseDocumentXml(xml);
    expect(variants).toHaveLength(1);
    expect(variants[0].questions).toHaveLength(3);

    const labels = variants[0].questions.map((question) => getCorrectLabel(question.options));
    expect(labels).toEqual(["C", "D", "D"]);
    expect(variants[0].questions[2].options).toHaveLength(4);
  });
});
