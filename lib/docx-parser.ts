import fs from "fs/promises";
import JSZip from "jszip";

export type ParsedOption = {
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

export type ParsedQuestion = {
  variantNumber: number;
  order: number;
  text: string;
  options: ParsedOption[];
};

export type ParsedVariant = {
  variantNumber: number;
  title: string;
  questions: ParsedQuestion[];
};

type Run = {
  text: string;
  bold: boolean;
};

type Paragraph = {
  text: string;
  runs: Run[];
};

type OptionChunk = {
  label: string;
  text: string;
  isCorrect: boolean;
};

type DraftQuestion = {
  variantNumber: number;
  textParts: string[];
  options: Map<string, OptionChunk>;
};

const VARIANT_REGEX =
  /(?:Вариант|Нұсқа|Нуска)\s*:?[\s\u00a0]*(?:№|No\.?)?[\s\u00a0]*(\d+)/i;

function extractOptionMarkers(text: string): RegExpMatchArray[] {
  const allMarkers = [...text.matchAll(/([A-E])\)\s*/g)];
  if (allMarkers.length === 0) {
    return allMarkers;
  }

  const firstAIndex = allMarkers.findIndex((marker) => marker[1] === "A");
  if (firstAIndex <= 0) {
    return allMarkers;
  }

  const fromA = allMarkers.slice(firstAIndex);
  const uniqueLabels = new Set(fromA.map((marker) => marker[1]));

  // Handles cases like "GND) ... A) ... B) ... C) ... D) ... E)":
  // discard noisy markers before the first real "A)" block.
  if (uniqueLabels.size >= 4) {
    return fromA;
  }

  return allMarkers;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xA0;/g, " ")
    .replace(/\u00a0/g, " ");
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractParagraphs(xml: string): Paragraph[] {
  const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  return paragraphs.map((paragraphXml) => {
    const runsXml = paragraphXml.match(/<w:r[\s\S]*?<\/w:r>/g) ?? [];
    const runs: Run[] = [];

    for (const runXml of runsXml) {
      const bold = /<w:rPr[\s\S]*?<w:b(?:\s*\/|>)/.test(runXml);
      const texts = [...runXml.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(
        (match) => decodeXml(match[1])
      );
      const brCount = [...runXml.matchAll(/<w:br(?:\s+[^>]*)?\/?\s*>/g)].length;
      const tabCount = [...runXml.matchAll(/<w:tab(?:\s+[^>]*)?\/?\s*>/g)].length;

      let text = texts.join("");
      if (brCount > 0) {
        text += "\n".repeat(brCount);
      }
      if (tabCount > 0) {
        text += "\t".repeat(tabCount);
      }

      if (text.length > 0) {
        runs.push({ text, bold });
      }
    }

    const text = runs.map((run) => run.text).join("");
    return {
      text: text.replace(/\u00a0/g, " "),
      runs
    };
  });
}

function hasBoldInRange(runs: Run[], start: number, end: number): boolean {
  let position = 0;

  for (const run of runs) {
    const runStart = position;
    const runEnd = position + run.text.length;
    position = runEnd;

    if (runEnd <= start || runStart >= end) {
      continue;
    }

    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);
    const localStart = overlapStart - runStart;
    const localEnd = overlapEnd - runStart;
    const snippet = run.text.slice(localStart, localEnd).trim();

    if (run.bold && snippet.length > 0) {
      return true;
    }
  }

  return false;
}

function extractOptionChunks(paragraph: Paragraph): OptionChunk[] {
  const text = paragraph.text;
  const markers = extractOptionMarkers(text);

  if (markers.length === 0) {
    return [];
  }

  const hasMarkerA = markers.some((marker) => marker[1] === "A");
  if (!hasMarkerA && markers.length === 1 && text.includes("?")) {
    return [];
  }

  const chunks: OptionChunk[] = [];

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const next = markers[index + 1];
    const label = marker[1];
    const markerStart = marker.index ?? 0;
    const optionStart = markerStart + marker[0].length;
    const optionEnd = next?.index ?? text.length;
    const optionText = normalizeText(text.slice(optionStart, optionEnd));

    if (optionText.length === 0) {
      continue;
    }

    chunks.push({
      label,
      text: optionText,
      isCorrect: hasBoldInRange(paragraph.runs, markerStart, optionEnd)
    });
  }

  return chunks;
}

function looksLikeQuestionText(text: string): boolean {
  if (text.length === 0) {
    return false;
  }

  if (/^[A-E]\)/.test(text)) {
    return false;
  }

  return text.includes("?");
}

function looksLikeAnswerSheetStart(text: string): boolean {
  return /(?:лист\s+ответа|лист\s+ответов|лист\s+жауап|жауап\s+парағы|answer\s*sheet)/i.test(
    text
  );
}

function finalizeDraft(
  draft: DraftQuestion | null,
  variants: Map<number, ParsedVariant>
): void {
  if (!draft) {
    return;
  }

  if (draft.options.size < 4) {
    return;
  }

  const variant = variants.get(draft.variantNumber);
  if (!variant) {
    return;
  }

  const labels = ["A", "B", "C", "D", "E"];
  const options = labels
    .filter((label) => draft.options.has(label))
    .map((label, index) => {
      const option = draft.options.get(label)!;
      return {
        label,
        text: option.text,
        isCorrect: option.isCorrect,
        order: index + 1
      };
    });

  if (options.length < 4) {
    return;
  }

  variant.questions.push({
    variantNumber: draft.variantNumber,
    order: variant.questions.length + 1,
    text: normalizeText(draft.textParts.join(" ")),
    options
  });
}

export function parseDocumentXml(xml: string): ParsedVariant[] {
  const paragraphs = extractParagraphs(xml);
  const variants = new Map<number, ParsedVariant>();

  let activeVariant: number | null = null;
  let draft: DraftQuestion | null = null;
  let skipNoiseBlock = false;

  for (const paragraph of paragraphs) {
    const paragraphText = normalizeText(paragraph.text);
    if (!paragraphText) {
      continue;
    }

    const heading = paragraphText.match(VARIANT_REGEX);
    if (heading) {
      finalizeDraft(draft, variants);
      draft = null;
      activeVariant = Number(heading[1]);
      skipNoiseBlock = false;

      if (!variants.has(activeVariant)) {
        variants.set(activeVariant, {
          variantNumber: activeVariant,
          title: `Вариант №${activeVariant}`,
          questions: []
        });
      }

      continue;
    }

    if (!activeVariant) {
      continue;
    }

    if (looksLikeAnswerSheetStart(paragraphText)) {
      finalizeDraft(draft, variants);
      draft = null;
      skipNoiseBlock = true;
      continue;
    }

    if (skipNoiseBlock) {
      continue;
    }

    const optionChunks = extractOptionChunks(paragraph);
    const markers = extractOptionMarkers(paragraph.text);
    const markerStart = markers[0]?.index ?? -1;
    const prefixText =
      markerStart >= 0
        ? normalizeText(paragraph.text.slice(0, markerStart))
        : paragraphText;

    if (optionChunks.length === 0) {
      if (looksLikeQuestionText(paragraphText)) {
        if (draft && draft.options.size >= 4) {
          finalizeDraft(draft, variants);
          draft = null;
        }

        if (!draft || draft.options.size > 0) {
          draft = {
            variantNumber: activeVariant,
            textParts: [paragraphText],
            options: new Map()
          };
        } else {
          draft.textParts.push(paragraphText);
        }
      } else if (draft) {
        if (draft.options.size > 0) {
          const latestLabel = [...draft.options.keys()].pop();
          if (latestLabel) {
            const latest = draft.options.get(latestLabel)!;
            latest.text = normalizeText(`${latest.text} ${paragraphText}`);
            draft.options.set(latestLabel, latest);
          }
        } else {
          draft.textParts.push(paragraphText);
        }
      }

      continue;
    }

    if (prefixText.length > 0) {
      if (draft && draft.options.size >= 4) {
        finalizeDraft(draft, variants);
        draft = null;
      }

      if (!draft || draft.options.size > 0) {
        draft = {
          variantNumber: activeVariant,
          textParts: [prefixText],
          options: new Map()
        };
      } else {
        draft.textParts.push(prefixText);
      }
    } else if (!draft) {
      draft = {
        variantNumber: activeVariant,
        textParts: ["Без текста вопроса"],
        options: new Map()
      };
    }

    for (const chunk of optionChunks) {
      if (!draft.options.has(chunk.label)) {
        draft.options.set(chunk.label, chunk);
      }
    }
  }

  finalizeDraft(draft, variants);

  return [...variants.values()].sort(
    (left, right) => left.variantNumber - right.variantNumber
  );
}

export async function parseDocxFile(path: string): Promise<ParsedVariant[]> {
  const fileBuffer = await fs.readFile(path);
  const zip = await JSZip.loadAsync(fileBuffer);
  const xmlFile = zip.file("word/document.xml");

  if (!xmlFile) {
    throw new Error("word/document.xml not found in DOCX");
  }

  const xml = await xmlFile.async("text");
  return parseDocumentXml(xml);
}
