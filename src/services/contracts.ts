import type { Attempt, Lesson, Preferences } from "../domain/types";

// UI depends only on these async contracts; adapters may use HTTP later.
export interface LessonService {
  list(): Promise<Lesson[]>;
}

export interface ProgressService {
  listAttempts(): Promise<Attempt[]>;
  /** Idempotent by attempt.id. A retry must never create duplicate records. */
  saveAttempt(attempt: Attempt): Promise<void>;
  /** Remove only the stored attempts for one lesson. */
  resetLesson(lessonId: string): Promise<void>;
  /** Remove every stored attempt. Must only be exposed behind explicit confirmation. */
  resetAll(): Promise<void>;
}

export interface PreferencesService {
  get(): Promise<Preferences>;
  update(patch: Partial<Preferences>): Promise<Preferences>;
}

export interface AppServices {
  lessons: LessonService;
  progress: ProgressService;
  preferences: PreferencesService;
  /** Optional cross-tab / backend subscription. Returns an unsubscribe function. */
  subscribe?: (onChange: () => void) => () => void;
}
