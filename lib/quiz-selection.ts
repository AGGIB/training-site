type SelectableOption = {
  text: string;
};

type SelectableQuestion = {
  id: string;
  text: string;
  options: SelectableOption[];
};

function normalizeValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function questionFingerprint(question: SelectableQuestion): string {
  const normalizedQuestion = normalizeValue(question.text);
  const optionSignature = question.options
    .map((option) => normalizeValue(option.text))
    .sort()
    .join("||");

  return `${normalizedQuestion}::${optionSignature}`;
}

export function dedupeQuestionsByFingerprint<T extends SelectableQuestion>(questions: T[]): T[] {
  const seenFingerprints = new Set<string>();
  const unique: T[] = [];

  for (const question of questions) {
    const fingerprint = questionFingerprint(question);
    if (seenFingerprints.has(fingerprint)) {
      continue;
    }

    seenFingerprints.add(fingerprint);
    unique.push(question);
  }

  return unique;
}

export function shuffleQuestions<T>(questions: T[], random: () => number = Math.random): T[] {
  const copy = [...questions];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }

  return copy;
}

export function selectUniqueQuestions<T extends SelectableQuestion>(
  questions: T[],
  limit: number
): T[] {
  return dedupeQuestionsByFingerprint(shuffleQuestions(questions)).slice(0, limit);
}
