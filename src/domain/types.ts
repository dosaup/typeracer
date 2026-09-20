export type Level = "Cơ bản" | "Trung cấp" | "Nâng cao";

export type ExerciseType =
  | "accuracy_test"
  | "alternating"
  | "focus_drill"
  | "mixed_drill"
  | "number_drill"
  | "pattern"
  | "pattern_drill"
  | "sentence"
  | "symbol_drill"
  | "timed_text"
  | "timed_words"
  | "warmup"
  | "word_drill";

export interface LessonExercise {
  type: ExerciseType;
  text: string;
  durationSeconds?: number;
}

export interface CurriculumPhase {
  id: string;
  title: string;
  lessonRange: [number, number];
  lessonCount: number;
}

export interface Curriculum {
  name: string;
  version: number;
  lessonCount: number;
  designNotes: string[];
  phases: CurriculumPhase[];
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  order: number;
  phaseId: string;
  phaseTitle: string;
  title: string;
  description: string;
  level: Level;
  keys: string[];
  newKeys: string[];
  focusKeys: string[];
  availableKeys: string[];
  type: string;
  exercises: LessonExercise[];
  estimatedMinutes: number;
  text: string;
  tip: string;
  targetWpm: number | null;
  targetAccuracy: number;
}

export interface TypingMistake {
  expected: string;
  actual: string;
  position: number;
}

export interface Attempt {
  id: string;
  lessonId: string;
  completedAt: string;
  durationMs: number;
  characters: number;
  keystrokes: number;
  correctKeystrokes: number;
  wpm: number;
  /** Total keystrokes per five-character word; absent on legacy attempts. */
  rawWpm?: number;
  accuracy: number;
  passed: boolean;
  mistakes: TypingMistake[];
}

export interface Preferences {
  sound: boolean;
  showHands: boolean;
  speedUnit: SpeedUnit;
  keyboardPlatform: KeyboardPlatformPreference;
  introSeen: boolean;
}

export type SpeedUnit = "wpm" | "cpm";
export type KeyboardPlatform = "mac" | "windows" | "linux";
export type KeyboardPlatformPreference = "auto" | KeyboardPlatform;

export interface TypingState {
  position: number;
  keystrokes: number;
  correctKeystrokes: number;
  mistakes: TypingMistake[];
}

export type Finger = "pinky" | "ring" | "middle" | "index" | "thumb";
export type Hand = "left" | "right";

export interface KeyGuide {
  key: string;
  code: string;
  hand: Hand;
  finger: Finger;
  shift: Hand | null;
}

/** A produced character resolves to one physical QWERTY key and an optional modifier. */
export interface Keystroke {
  key: string;
  code: string;
  shift: boolean;
}
