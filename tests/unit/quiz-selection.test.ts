import {
  dedupeQuestionsByFingerprint,
  questionFingerprint,
  selectUniqueQuestions,
  shuffleQuestions
} from "@/lib/quiz-selection";

describe("quiz selection", () => {
  it("builds same fingerprint for same question/options with formatting differences", () => {
    const first = questionFingerprint({
      id: "1",
      text: " What is PWM? ",
      options: [{ text: "Pulse Width Modulation" }, { text: "Analog output" }]
    });

    const second = questionFingerprint({
      id: "2",
      text: "what is    pwm?",
      options: [{ text: "analog output" }, { text: " Pulse Width Modulation " }]
    });

    expect(first).toBe(second);
  });

  it("deduplicates repeated questions by fingerprint", () => {
    const questions = [
      {
        id: "a",
        text: "Q1?",
        options: [{ text: "A1" }, { text: "B1" }]
      },
      {
        id: "b",
        text: " Q1? ",
        options: [{ text: "B1" }, { text: "A1" }]
      },
      {
        id: "c",
        text: "Q2?",
        options: [{ text: "A2" }, { text: "B2" }]
      }
    ];

    const unique = dedupeQuestionsByFingerprint(questions);

    expect(unique.map((question) => question.id)).toEqual(["a", "c"]);
  });

  it("selects only unique questions in mixed mode", () => {
    const questions = [
      {
        id: "1",
        text: "Repeat",
        options: [{ text: "A" }, { text: "B" }]
      },
      {
        id: "2",
        text: "Repeat",
        options: [{ text: "B" }, { text: "A" }]
      },
      {
        id: "3",
        text: "Unique 1",
        options: [{ text: "A1" }, { text: "B1" }]
      },
      {
        id: "4",
        text: "Unique 2",
        options: [{ text: "A2" }, { text: "B2" }]
      }
    ];

    const selected = selectUniqueQuestions(questions, 10);
    const fingerprints = selected.map((question) => questionFingerprint(question));

    expect(new Set(fingerprints).size).toBe(selected.length);
    expect(selected.length).toBe(3);
  });

  it("keeps list size while shuffling", () => {
    const source = ["a", "b", "c", "d"];
    const shuffled = shuffleQuestions(source);

    expect(shuffled).toHaveLength(source.length);
    expect(shuffled.sort()).toEqual([...source].sort());
  });
});
