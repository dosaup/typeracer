import { lessons } from "../data/lessons";
import type { Attempt, KeyboardPlatformPreference, Preferences, Profile, SpeedUnit, TypingMistake } from "../domain/types";
import type { AppServices } from "./contracts";

const ATTEMPTS_KEY = "keylane.attempts.v1";
const PREFERENCES_KEY = "keylane.preferences.v1";
const PROFILES_KEY = "keylane.profiles.v1";
const ACTIVE_PROFILE_KEY = "keylane.active-profile.v1";
const DEFAULT_PROFILE_ID = "default";
const defaults: Preferences = {
  sound: true,
  showHands: true,
  speedUnit: "wpm",
  keyboardPlatform: "auto",
  introSeen: false,
  lockLessons: true,
};
type StoredPreferences = Omit<Preferences, "speedUnit" | "keyboardPlatform" | "introSeen" | "lockLessons"> & {
  speedUnit?: SpeedUnit;
  keyboardPlatform?: KeyboardPlatformPreference;
  introSeen?: boolean;
  lockLessons?: boolean;
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
function isProfile(value: unknown): value is Profile {
  return (
    record(value) &&
    typeof value.id === "string" &&
    /^[a-zA-Z0-9-]+$/.test(value.id) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 40 &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt))
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
  const attemptsKey = (profileId: string) => `${ATTEMPTS_KEY}.${profileId}`;
  const preferencesKey = (profileId: string) => `${PREFERENCES_KEY}.${profileId}`;

  const ensureProfiles = (): { profiles: Profile[]; activeId: string } => {
    const storage = getStorage();
    let profiles = read(
      storage,
      PROFILES_KEY,
      [],
      (value): value is Profile[] =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(isProfile) &&
        new Set(value.map((profile) => profile.id)).size === value.length,
    );

    if (!profiles.length) {
      const initial: Profile = {
        id: DEFAULT_PROFILE_ID,
        name: "Người học 1",
        createdAt: new Date().toISOString(),
      };
      const legacyAttempts = read(
        storage,
        ATTEMPTS_KEY,
        [],
        (value): value is Attempt[] => Array.isArray(value) && value.every(isAttempt),
      );
      const legacyPreferences = read(
        storage,
        PREFERENCES_KEY,
        defaults,
        isStoredPreferences,
      );
      write(storage, attemptsKey(initial.id), legacyAttempts);
      write(storage, preferencesKey(initial.id), legacyPreferences);
      profiles = [initial];
      write(storage, PROFILES_KEY, profiles);
      write(storage, ACTIVE_PROFILE_KEY, initial.id);
    }

    const storedActiveId = read(
      storage,
      ACTIVE_PROFILE_KEY,
      profiles[0].id,
      (value): value is string => typeof value === "string",
    );
    const activeId = profiles.some((profile) => profile.id === storedActiveId)
      ? storedActiveId
      : profiles[0].id;
    if (activeId !== storedActiveId) write(storage, ACTIVE_PROFILE_KEY, activeId);
    return { profiles, activeId };
  };

  const activeProfileId = () => ensureProfiles().activeId;
  const normalizeProfileName = (rawName: string): string => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) throw new Error("Hãy nhập tên profile.");
    if (name.length > 40) throw new Error("Tên profile không được dài quá 40 ký tự.");
    return name;
  };
  const readAttempts = (profileId = activeProfileId()) =>
    read(
      getStorage(),
      attemptsKey(profileId),
      [],
      (value): value is Attempt[] =>
        Array.isArray(value) && value.every(isAttempt),
    );
  function isStoredPreferences(value: unknown): value is StoredPreferences {
    return (
      record(value) &&
      typeof value.sound === "boolean" &&
      typeof value.showHands === "boolean" &&
      (value.speedUnit === undefined || value.speedUnit === "wpm" || value.speedUnit === "cpm") &&
      (value.keyboardPlatform === undefined || ["auto", "mac", "windows", "linux"].includes(value.keyboardPlatform as string)) &&
      (value.introSeen === undefined || typeof value.introSeen === "boolean") &&
      (value.lockLessons === undefined || typeof value.lockLessons === "boolean")
    );
  }
  const readPreferences = (profileId = activeProfileId()): Preferences => {
    const stored = read(
      getStorage(),
      preferencesKey(profileId),
      defaults,
      isStoredPreferences,
    );
    return {
      ...stored,
      speedUnit: stored.speedUnit ?? "wpm",
      keyboardPlatform: stored.keyboardPlatform ?? "auto",
      introSeen: stored.introSeen ?? false,
      lockLessons: stored.lockLessons ?? true,
    };
  };
  return {
    lessons: { list: async () => lessons },
    profiles: {
      list: async () => ensureProfiles().profiles,
      getActive: async () => {
        const { profiles, activeId } = ensureProfiles();
        return profiles.find((profile) => profile.id === activeId)!;
      },
      create: async (rawName) => {
        const name = normalizeProfileName(rawName);
        const create = () => {
          const { profiles } = ensureProfiles();
          if (profiles.some((profile) => profile.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")))
            throw new Error("Tên profile này đã tồn tại.");
          const profile: Profile = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
          };
          write(getStorage(), attemptsKey(profile.id), []);
          write(getStorage(), preferencesKey(profile.id), defaults);
          write(getStorage(), PROFILES_KEY, [...profiles, profile]);
          return profile;
        };
        return typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request(PROFILES_KEY, create)
          : create();
      },
      rename: async (profileId, rawName) => {
        const name = normalizeProfileName(rawName);
        const rename = () => {
          const { profiles } = ensureProfiles();
          const current = profiles.find((profile) => profile.id === profileId);
          if (!current) throw new Error("Profile cần đổi tên không còn tồn tại.");
          if (profiles.some((profile) =>
            profile.id !== profileId &&
            profile.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")
          )) throw new Error("Tên profile này đã tồn tại.");
          const updated = { ...current, name };
          write(
            getStorage(),
            PROFILES_KEY,
            profiles.map((profile) => profile.id === profileId ? updated : profile),
          );
          return updated;
        };
        return typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request(PROFILES_KEY, rename)
          : rename();
      },
      setActive: async (profileId) => {
        const { profiles } = ensureProfiles();
        const profile = profiles.find((item) => item.id === profileId);
        if (!profile) throw new Error("Profile đã chọn không còn tồn tại.");
        write(getStorage(), ACTIVE_PROFILE_KEY, profile.id);
        return profile;
      },
    },
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
        const profileId = activeProfileId();
        const key = attemptsKey(profileId);
        const save = () => {
          const attempts = readAttempts(profileId);
          if (!attempts.some((a) => a.id === attempt.id))
            write(getStorage(), key, [...attempts, attempt]);
        };
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(key, save);
        else save();
      },
      resetLesson: async (lessonId) => {
        if (!lessonId) throw new Error("Không xác định được bài cần đặt lại.");
        const profileId = activeProfileId();
        const key = attemptsKey(profileId);
        const reset = () => {
          const remaining = readAttempts(profileId).filter(
            (attempt) => attempt.lessonId !== lessonId,
          );
          write(getStorage(), key, remaining);
        };
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(key, reset);
        else reset();
      },
      resetAll: async () => {
        const key = attemptsKey(activeProfileId());
        const reset = () => write(getStorage(), key, []);
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(key, reset);
        else reset();
      },
    },
    preferences: {
      get: async () => readPreferences(),
      update: async (patch) => {
        const profileId = activeProfileId();
        const key = preferencesKey(profileId);
        const update = () => {
          const next = { ...readPreferences(profileId), ...patch };
          write(getStorage(), key, next);
          return next;
        };
        return typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request(key, update)
          : update();
      },
    },
    subscribe: (onChange) => {
      const listener = (event: StorageEvent) => {
        if (
          event.key === null ||
          event.key === PROFILES_KEY ||
          event.key === ACTIVE_PROFILE_KEY ||
          event.key?.startsWith(`${ATTEMPTS_KEY}.`) ||
          event.key?.startsWith(`${PREFERENCES_KEY}.`)
        )
          onChange();
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}
