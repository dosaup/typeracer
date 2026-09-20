import { lessons } from "../data/lessons";
import type { Attempt, KeyboardPlatformPreference, Preferences, SpeedUnit, TypingMistake } from "../domain/types";
import type { AppServices } from "./contracts";

const ATTEMPTS_KEY = "keylane.attempts.v1";
const PREFERENCES_KEY = "keylane.preferences.v1";
const defaults: Preferences = {
  sound: true,
  showHands: true,
  speedUnit: "wpm",
  keyboardPlatform: "auto",
  introSeen: false,
};
type StoredPreferences = Omit<Preferences, "speedUnit" | "keyboardPlatform" | "introSeen"> & {
  speedUnit?: SpeedUnit;
  keyboardPlatform?: KeyboardPlatformPreference;
  introSeen?: boolean;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isMistake(value: unknown): value is TypingMistake {
  return (
    record(value) &&
    typeof value.expected === "string" &&
    typeof value.actual === "string" &&
    finite(value.position) &&
    Number.isInteger(value.position)
  );
}
function isAttempt(value: unknown): value is Attempt {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.lessonId === "string" &&
    typeof value.completedAt === "string" &&
    Number.isFinite(Date.parse(value.completedAt)) &&
    finite(value.durationMs) &&
    value.durationMs > 0 &&
    finite(value.characters) &&
    finite(value.keystrokes) &&
    finite(value.correctKeystrokes) &&
    value.correctKeystrokes <= value.keystrokes &&
    finite(value.wpm) &&
    (value.rawWpm === undefined || finite(value.rawWpm)) &&
    finite(value.accuracy) &&
    value.accuracy <= 100 &&
    typeof value.passed === "boolean" &&
    Array.isArray(value.mistakes) &&
    value.mistakes.every(isMistake)
  );
}

function read<T>(
  storage: Storage,
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    throw new Error(
      "Trình duyệt đang chặn bộ nhớ. Hãy cho phép lưu dữ liệu cho trang này rồi thử lại.",
    );
  }
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate(parsed)) return parsed;
  } catch {
    /* Preserve corrupt data; never silently overwrite it. */
  }
  throw new Error(
    "Dữ liệu đã lưu không hợp lệ hoặc thuộc phiên bản khác. Dữ liệu gốc được giữ nguyên; hãy kiểm tra bộ nhớ trình duyệt.",
  );
}

function write(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Chưa lưu được dữ liệu. Bộ nhớ có thể đã đầy hoặc bị chặn. Giữ trang này mở và thử lưu lại.",
    );
  }
}

/** Only this adapter knows about localStorage. Each write re-reads current data. */
export function createLocalServices(
  getStorage: () => Storage = () => window.localStorage,
): AppServices {
  const readAttempts = () =>
    read(
      getStorage(),
      ATTEMPTS_KEY,
      [],
      (value): value is Attempt[] =>
        Array.isArray(value) && value.every(isAttempt),
    );
  const readPreferences = (): Preferences => {
    const stored = read(
      getStorage(),
      PREFERENCES_KEY,
      defaults,
      (value): value is StoredPreferences =>
        record(value) &&
        typeof value.sound === "boolean" &&
        typeof value.showHands === "boolean" &&
        (value.speedUnit === undefined || value.speedUnit === "wpm" || value.speedUnit === "cpm") &&
        (value.keyboardPlatform === undefined || ["auto", "mac", "windows", "linux"].includes(value.keyboardPlatform as string)) &&
        (value.introSeen === undefined || typeof value.introSeen === "boolean"),
    );
    return {
      ...stored,
      speedUnit: stored.speedUnit ?? "wpm",
      keyboardPlatform: stored.keyboardPlatform ?? "auto",
      introSeen: stored.introSeen ?? false,
    };
  };
  return {
    lessons: { list: async () => lessons },
    progress: {
      listAttempts: async () =>
        readAttempts().sort((a, b) =>
          b.completedAt.localeCompare(a.completedAt),
        ),
      saveAttempt: async (attempt) => {
        if (!isAttempt(attempt))
          throw new Error("Kết quả bài tập không hợp lệ.");
        // localStorage reads and writes are synchronous within this operation.
        // Web Locks also serialize writes across tabs when supported.
        const save = () => {
          const attempts = readAttempts();
          if (!attempts.some((a) => a.id === attempt.id))
            write(getStorage(), ATTEMPTS_KEY, [...attempts, attempt]);
        };
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(ATTEMPTS_KEY, save);
        else save();
      },
      resetLesson: async (lessonId) => {
        if (!lessonId) throw new Error("Không xác định được bài cần đặt lại.");
        const reset = () => {
          const remaining = readAttempts().filter(
            (attempt) => attempt.lessonId !== lessonId,
          );
          write(getStorage(), ATTEMPTS_KEY, remaining);
        };
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(ATTEMPTS_KEY, reset);
        else reset();
      },
    },
    preferences: {
      get: async () => readPreferences(),
      update: async (patch) => {
        const update = () => {
          const next = { ...readPreferences(), ...patch };
          write(getStorage(), PREFERENCES_KEY, next);
          return next;
        };
        return typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request(PREFERENCES_KEY, update)
          : update();
      },
    },
    subscribe: (onChange) => {
      const listener = (event: StorageEvent) => {
        if (
          event.key === null ||
          event.key === ATTEMPTS_KEY ||
          event.key === PREFERENCES_KEY
        )
          onChange();
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}
