import { applyProgressResult, TARGET_STREAK } from "@/lib/mistake-logic";

describe("applyProgressResult", () => {
  it("activates queue on first wrong answer", () => {
    const result = applyProgressResult(null, false);
    expect(result.isActive).toBe(true);
    expect(result.streak).toBe(0);
    expect(result.timesWrong).toBe(1);
    expect(result.timesCorrect).toBe(0);
  });

  it("does not activate queue on first correct answer", () => {
    const result = applyProgressResult(null, true);
    expect(result.isActive).toBe(false);
    expect(result.streak).toBe(0);
    expect(result.timesCorrect).toBe(1);
  });

  it("resolves active mistake after 3 correct in row", () => {
    const after1 = applyProgressResult(
      {
        streak: 0,
        isActive: true,
        timesWrong: 2,
        timesCorrect: 0
      },
      true
    );
    const after2 = applyProgressResult(after1, true);
    const after3 = applyProgressResult(after2, true);

    expect(after3.isActive).toBe(false);
    expect(after3.streak).toBe(TARGET_STREAK);
  });

  it("resets streak on wrong answer", () => {
    const result = applyProgressResult(
      {
        streak: 2,
        isActive: true,
        timesWrong: 1,
        timesCorrect: 2
      },
      false
    );

    expect(result.streak).toBe(0);
    expect(result.isActive).toBe(true);
    expect(result.timesWrong).toBe(2);
  });
});
