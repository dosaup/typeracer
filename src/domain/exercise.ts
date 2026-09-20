import type { Lesson, LessonExercise } from "./types";
import { keystrokeFor } from "./keyboard";

export type TypingLessonContext = Pick<Lesson, "phaseId" | "availableKeys">;
type ExerciseLesson = Pick<Lesson, "id" | "phaseId" | "availableKeys" | "focusKeys" | "newKeys">;
type LessonTextContext = ExerciseLesson & Pick<Lesson, "order">;

export interface LessonCapabilities {
  availableCharacters: ReadonlySet<string>;
  physicalCodes: ReadonlySet<string>;
  shift: boolean;
}

export interface TypingContentIssue {
  index: number;
  character: string;
  physicalKey: string | null;
  physicalCode: string | null;
  requiredModifier: "Shift" | null;
  reason: "unsupported-character" | "physical-key-unavailable" | "modifier-unavailable" | "capability-unavailable";
}

const SHIFT_PHASES = new Set(["shift", "punctuation", "numbers", "symbols", "accuracy", "speed"]);

export function hasShiftCapability(lesson: TypingLessonContext): boolean {
  return SHIFT_PHASES.has(lesson.phaseId);
}

export function capabilitiesForLesson(lesson: TypingLessonContext): LessonCapabilities {
  return {
    availableCharacters: new Set(lesson.availableKeys),
    physicalCodes: new Set(
      lesson.availableKeys.map((character) => keystrokeFor(character)?.code)
        .filter((code): code is string => Boolean(code)),
    ),
    shift: hasShiftCapability(lesson),
  };
}

export function validateTypingContent(
  text: string,
  capabilities: LessonCapabilities,
): TypingContentIssue[] {
  return [...text].flatMap((character, index): TypingContentIssue[] => {
    if (/\s/u.test(character)) return [];
    const stroke = keystrokeFor(character);
    if (!stroke) return [{
      index, character, physicalKey: null, physicalCode: null, requiredModifier: null,
      reason: "unsupported-character",
    }];
    if (!capabilities.physicalCodes.has(stroke.code)) return [{
      index, character, physicalKey: stroke.key, physicalCode: stroke.code,
      requiredModifier: stroke.shift ? "Shift" : null, reason: "physical-key-unavailable",
    }];
    if (stroke.shift && !capabilities.shift) return [{
      index, character, physicalKey: stroke.key, physicalCode: stroke.code,
      requiredModifier: "Shift", reason: "modifier-unavailable",
    }];

    const uppercaseFromUnlockedLetter = /^[A-Z]$/.test(character)
      && capabilities.availableCharacters.has(character.toLowerCase());
    if (!capabilities.availableCharacters.has(character) && !uppercaseFromUnlockedLetter) return [{
      index, character, physicalKey: stroke.key, physicalCode: stroke.code,
      requiredModifier: stroke.shift ? "Shift" : null, reason: "capability-unavailable",
    }];
    return [];
  });
}

const WORD_BANK = [
  "a", "about", "after", "again", "all", "also", "and", "any", "are", "as", "at", "back", "be", "been", "before", "best", "book", "both", "brave", "build", "but", "by", "calm", "can", "care", "child", "code", "come", "could", "create", "day", "did", "do", "each", "easy", "even", "every", "fast", "find", "finger", "first", "flow", "focus", "for", "form", "friend", "from", "get", "give", "go", "good", "great", "green", "had", "hand", "happy", "has", "have", "help", "her", "here", "home", "how", "i", "if", "in", "is", "it", "just", "keep", "key", "kind", "know", "last", "learn", "left", "light", "like", "line", "little", "look", "made", "make", "many", "may", "me", "more", "most", "move", "music", "must", "my", "name", "new", "next", "no", "not", "now", "of", "off", "old", "on", "one", "only", "open", "or", "other", "out", "over", "part", "people", "place", "please", "point", "practice", "quick", "read", "red", "right", "river", "run", "said", "same", "say", "school", "see", "she", "show", "side", "small", "smart", "smooth", "so", "some", "sound", "space", "speed", "steady", "step", "still", "stop", "take", "team", "tell", "than", "that", "the", "then", "there", "thing", "think", "this", "time", "to", "together", "too", "touch", "type", "up", "use", "want", "was", "way", "we", "well", "went", "were", "what", "when", "which", "who", "will", "with", "word", "work", "write", "year", "you", "your",
];

const SENTENCE_BANK = [
  "Keep your eyes on the screen and let your fingers find the keys.",
  "Practice a little every day and keep your hands relaxed.",
  "A steady rhythm is better than rushing through each line.",
  "Accuracy comes before speed when you learn to type.",
  "Small improvements add up when you practice with focus.",
  "Type each word carefully, then build speed over time.",
  "Use both hands and return your fingers to the home row.",
  "Good posture helps your hands move freely across the keyboard.",
];

function sentenceVariants(sentence: string): string[] {
  const lowerInitial = `${sentence[0].toLowerCase()}${sentence.slice(1)}`;
  return [sentence, lowerInitial, lowerInitial.replace(/[.!?]$/, "")];
}

function randomFrom(seed: string): () => number {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function isCharacterAvailable(
  character: string,
  lesson: TypingLessonContext,
): boolean {
  return validateTypingContent(character, capabilitiesForLesson(lesson)).length === 0;
}

export function isTextAvailable(
  text: string,
  lesson: TypingLessonContext,
): boolean {
  return validateTypingContent(text, capabilitiesForLesson(lesson)).length === 0;
}

export function eligibleWords(
  words: string[],
  lesson: TypingLessonContext,
): string[] {
  return words.filter((word) => isTextAvailable(word, lesson));
}

function repeatToLength(tokens: string[], length: number): string {
  const output: string[] = [];
  let size = 0;
  for (let index = 0; size < length && tokens.length; index++) {
    const token = tokens[index % tokens.length];
    output.push(token);
    size += token.length + (output.length > 1 ? 1 : 0);
  }
  return output.join(" ");
}

function lessonLengthLimit(order: number): number {
  if (order <= 23) return 180;
  if (order <= 86) return 220;
  if (order <= 120) return 260;
  if (order <= 175) return 300;
  if (order <= 220) return 320;
  return 400;
}

function truncateAtTokenBoundary(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const candidate = text.slice(0, limit + 1);
  const boundary = candidate.lastIndexOf(" ");
  return candidate.slice(0, boundary >= Math.floor(limit * 0.7) ? boundary : limit).trimEnd();
}

function generatedTokens(
  lesson: ExerciseLesson,
  exercise: LessonExercise,
  random: () => number,
): string[] {
  const focus = (lesson.focusKeys.length ? lesson.focusKeys : lesson.newKeys).filter((key) => key !== " ");
  const available = lesson.availableKeys.filter((key) => key !== " " && key.length === 1);
  const drillKeys = exercise.type === "number_drill"
    ? available.filter((key) => /\d/.test(key))
    : available;
  const keys = focus.length ? focus : available;
  const words = eligibleWords(WORD_BANK, lesson);
  const sentences = [...new Set(SENTENCE_BANK.flatMap(sentenceVariants))]
    .filter((sentence) => isTextAvailable(sentence, lesson));

  if ((exercise.type === "sentence" || exercise.type === "timed_text") && sentences.length)
    return sentences.map((sentence) => ({ sentence, rank: random() })).sort((a, b) => a.rank - b.rank).map(({ sentence }) => sentence);
  if (["word_drill", "timed_words", "warmup", "accuracy_test"].includes(exercise.type) && words.length >= 8)
    return Array.from({ length: Math.max(20, words.length) }, () => words[Math.floor(random() * words.length)]);
  if (!keys.length) return [" "];
  const partners = drillKeys.filter((key) => !keys.includes(key));
  return Array.from({ length: 36 }, (_, index) => {
    const key = keys[index % keys.length];
    if (exercise.type === "focus_drill") return key.repeat(3);
    const partner = partners.length ? partners[Math.floor(random() * partners.length)] : keys[(index + 1) % keys.length];
    if (exercise.type === "alternating") return `${key}${partner}${key}${partner}`;
    if (exercise.type === "pattern" || exercise.type === "pattern_drill") return `${key}${partner}${partner}${key}`;
    return `${key}${partner}${keys[Math.floor(random() * keys.length)]}`;
  });
}

export function generateExercise({ lesson, exercise, seed }: {
  lesson: ExerciseLesson;
  exercise: LessonExercise;
  seed: string | number;
}): string {
  const normalized = exercise.text.replace(/\s+/g, " ").trim();
  const capabilities = capabilitiesForLesson(lesson);
  if (normalized && validateTypingContent(normalized, capabilities).length === 0) return normalized;
  const generated = repeatToLength(
    generatedTokens(lesson, exercise, randomFrom(`${lesson.id}:${exercise.type}:${seed}`)),
    Math.max(24, normalized.length),
  );
  const issues = validateTypingContent(generated, capabilities);
  if (issues.length) {
    const first = issues[0];
    throw new Error(`Generator produced unavailable character ${JSON.stringify(first.character)} for ${lesson.id}.`);
  }
  return generated;
}

export function generateLessonText(
  lesson: LessonTextContext,
  exercises: LessonExercise[],
  seed: string | number = "default",
): string {
  const combined = exercises
    .map((exercise, index) => generateExercise({ lesson, exercise, seed: `${seed}:${index}` }))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const result = truncateAtTokenBoundary(combined, lessonLengthLimit(lesson.order));
  const issues = validateTypingContent(result, capabilitiesForLesson(lesson));
  if (issues.length) throw new Error(`Combined lesson text is invalid for ${lesson.id}.`);
  return result;
}
