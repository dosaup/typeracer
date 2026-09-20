import type { Attempt, Lesson, SpeedUnit, TypingState } from "./types";

export const initialTypingState = (): TypingState => ({
  position: 0,
  keystrokes: 0,
  correctKeystrokes: 0,
  mistakes: [],
});

// Errors block progress. Backspace reverses progress, never erases error history.
export function acceptKey(
  state: TypingState,
  key: string,
  text: string,
): TypingState {
  if (state.position >= text.length) return state;
  if (key === "Backspace")
    return { ...state, position: Math.max(0, state.position - 1) };
  if (key.length !== 1) return state;
  const correct = key === text[state.position];
  return {
    position: state.position + (correct ? 1 : 0),
    keystrokes: state.keystrokes + 1,
    correctKeystrokes: state.correctKeystrokes + (correct ? 1 : 0),
    mistakes: correct
      ? state.mistakes
      : [
          ...state.mistakes,
          {
            expected: text[state.position],
            actual: key,
            position: state.position,
          },
        ],
  };
}

export function accuracyOf(
  state: Pick<TypingState, "keystrokes" | "correctKeystrokes">,
): number {
  return state.keystrokes === 0
    ? 100
    : (state.correctKeystrokes / state.keystrokes) * 100;
}

// A standardized word is five characters, including spaces. Pauses are excluded.
export function wpmOf(characters: number, durationMs: number): number {
  return durationMs <= 0 ? 0 : characters / 5 / (durationMs / 60_000);
}

export function cpmOf(characters: number, durationMs: number): number {
  return durationMs <= 0 ? 0 : characters / (durationMs / 60_000);
}

export function formatSpeed(wpm: number, unit: SpeedUnit): string {
  return `${Math.round(unit === "wpm" ? wpm : wpm * 5)} ${unit.toUpperCase()}`;
}

export function makeAttempt(
  lesson: Lesson,
  state: TypingState,
  durationMs: number,
  id: string,
): Attempt {
  const accuracy = accuracyOf(state);
  const wpm = wpmOf(state.position, durationMs);
  return {
    id,
    lessonId: lesson.id,
    completedAt: new Date().toISOString(),
    durationMs,
    characters: state.position,
    keystrokes: state.keystrokes,
    correctKeystrokes: state.correctKeystrokes,
    wpm,
    rawWpm: wpmOf(state.keystrokes, durationMs),
    accuracy,
    passed:
      accuracy >= lesson.targetAccuracy &&
      (lesson.targetWpm === null || wpm >= lesson.targetWpm),
    mistakes: state.mistakes,
  };
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function keyLabel(key: string): string {
  return key === " " ? "Space" : key;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getStreak(attempts: Attempt[]): number {
  const dates = new Set(
    attempts.map((a) => localDateKey(new Date(a.completedAt))),
  );
  const day = new Date();
  if (!dates.has(localDateKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
