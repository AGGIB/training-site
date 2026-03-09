export const TARGET_STREAK = 3;

export type ProgressShape = {
  streak: number;
  isActive: boolean;
  timesWrong: number;
  timesCorrect: number;
};

export function applyProgressResult(
  current: ProgressShape | null,
  isCorrect: boolean
): ProgressShape {
  if (!current) {
    if (isCorrect) {
      return {
        streak: 0,
        isActive: false,
        timesWrong: 0,
        timesCorrect: 1
      };
    }

    return {
      streak: 0,
      isActive: true,
      timesWrong: 1,
      timesCorrect: 0
    };
  }

  if (!isCorrect) {
    return {
      streak: 0,
      isActive: true,
      timesWrong: current.timesWrong + 1,
      timesCorrect: current.timesCorrect
    };
  }

  const nextTimesCorrect = current.timesCorrect + 1;

  if (!current.isActive) {
    return {
      streak: current.streak,
      isActive: false,
      timesWrong: current.timesWrong,
      timesCorrect: nextTimesCorrect
    };
  }

  const nextStreak = current.streak + 1;
  const isResolved = nextStreak >= TARGET_STREAK;

  return {
    streak: isResolved ? TARGET_STREAK : nextStreak,
    isActive: !isResolved,
    timesWrong: current.timesWrong,
    timesCorrect: nextTimesCorrect
  };
}
