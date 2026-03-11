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

  it("does not treat GND) inside question text as option D marker", () => {
    const xml = `
<w:document>
  <w:body>
    <w:p><w:r><w:t>Нұсқа №2</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>3. Жер (GND) үшін қандай түсті сым әдетте қолданылады?A) ҚызылB) АқC) ЖасылD) Сары</w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>E) Қара немесе көк</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const variants = parseDocumentXml(xml);
    expect(variants).toHaveLength(1);
    expect(variants[0].questions).toHaveLength(1);
    expect(variants[0].questions[0].text).toContain("GND) үшін қандай түсті сым");
    expect(variants[0].questions[0].options.map((option) => option.text)).toEqual([
      "Қызыл",
      "Ақ",
      "Жасыл",
      "Сары",
      "Қара немесе көк"
    ]);
    expect(getCorrectLabel(variants[0].questions[0].options)).toBe("E");
  });

  it("does not append answer-sheet block to the last option", () => {
    const xml = `
<w:document>
  <w:body>
    <w:p><w:r><w:t>Вариант: №9</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>Q40?A) finallyB) tryC) catchD) throw</w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>E) always</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>Лист ответа</w:t></w:r></w:p>
    <w:p><w:r><w:t>№</w:t></w:r></w:p>
    <w:p><w:r><w:t>I вариант</w:t></w:r></w:p>
    <w:p><w:r><w:t>40</w:t></w:r></w:p>
    <w:p><w:r><w:t>C B B A E D B B A</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const variants = parseDocumentXml(xml);
    expect(variants).toHaveLength(1);
    expect(variants[0].questions).toHaveLength(1);
    expect(variants[0].questions[0].options.find((option) => option.label === "E")?.text).toBe(
      "always"
    );
    expect(getCorrectLabel(variants[0].questions[0].options)).toBe("E");
  });
});
