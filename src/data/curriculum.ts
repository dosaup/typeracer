import rawCurriculum from "./curriculum.json";
import { capabilitiesForLesson, generateLessonText, validateTypingContent } from "../domain/exercise";
import type { Curriculum, CurriculumPhase, ExerciseType, Lesson, LessonExercise, Level } from "../domain/types";

interface RawLesson {
  id: number;
  phase: string;
  title: string;
  type: string;
  newKeys: string[];
  focusKeys: string[];
  availableKeys: string[];
  target: { accuracy: number; wpm: number | null };
  estimatedMinutes: number;
  exercises: Array<{ type: string; text: string; durationSeconds?: number }>;
}

interface RawCurriculum {
  name: string;
  version: number;
  lessonCount: number;
  designNotes: string[];
  phases: CurriculumPhase[];
  lessons: RawLesson[];
}

export interface CurriculumIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
  lessonId?: number;
  exerciseIndex?: number;
  character?: string;
  physicalKey?: string | null;
  requiredModifier?: "Shift" | null;
  reason?: string;
}

const source = rawCurriculum as unknown as RawCurriculum;
const exerciseTypes = new Set<ExerciseType>([
  "accuracy_test", "alternating", "focus_drill", "mixed_drill", "number_drill",
  "pattern", "pattern_drill", "sentence", "symbol_drill", "timed_text",
  "timed_words", "warmup", "word_drill",
]);

function levelFor(order: number): Level {
  if (order <= 86) return "Cơ bản";
  if (order <= 175) return "Trung cấp";
  return "Nâng cao";
}

function descriptionFor(lesson: RawLesson, phase: CurriculumPhase): string {
  const keys = lesson.newKeys.length ? lesson.newKeys : lesson.focusKeys;
  const focus = keys.length
    ? ` Tập trung vào ${keys.map((key) => (key === " " ? "Space" : key)).join(", ")}.`
    : " Củng cố các phím và mẫu đã học.";
  return `${phase.title} · khoảng ${lesson.estimatedMinutes} phút.${focus}`;
}

function tipFor(order: number): string {
  if (order <= 23) return "Giữ tay ở hàng cơ sở, gõ chậm và đưa ngón về đúng vị trí sau mỗi phím.";
  if (order <= 120) return "Ưu tiên nhịp đều và độ chính xác; chỉ tăng tốc khi chuyển hàng phím đã thoải mái.";
  if (order <= 150) return "Dùng Shift ở tay đối diện với tay gõ chữ cái và tránh bật Caps Lock.";
  if (order <= 220) return "Nhìn ký hiệu cần gõ và phối hợp Shift bằng tay đối diện khi cần.";
  return "Giữ vai và cổ tay thả lỏng; tập trung vào độ chính xác trước tốc độ.";
}

function adaptExercise(exercise: RawLesson["exercises"][number]): LessonExercise {
  if (!exerciseTypes.has(exercise.type as ExerciseType))
    throw new Error(`Loại bài tập không hỗ trợ: ${exercise.type}`);
  return {
    type: exercise.type as ExerciseType,
    text: exercise.text,
    ...(exercise.durationSeconds === undefined ? {} : { durationSeconds: exercise.durationSeconds }),
  };
}

function adaptLesson(raw: RawLesson, phases: CurriculumPhase[]): Lesson {
  const phase = phases.find((item) => item.id === raw.phase);
  if (!phase) throw new Error(`Bài ${raw.id} tham chiếu phase không tồn tại.`);
  const exercises = raw.exercises.map(adaptExercise);
  const base = {
    id: `lesson-${raw.id}`,
    order: raw.id,
    phaseId: phase.id,
    phaseTitle: phase.title,
    title: raw.title,
    description: descriptionFor(raw, phase),
    level: levelFor(raw.id),
    keys: (raw.newKeys.length ? raw.newKeys : raw.focusKeys).slice(0, 12),
    newKeys: raw.newKeys,
    focusKeys: raw.focusKeys,
    availableKeys: raw.availableKeys,
    type: raw.type,
    exercises,
    estimatedMinutes: raw.estimatedMinutes,
    tip: tipFor(raw.id),
    targetWpm: raw.target.wpm,
    targetAccuracy: raw.target.accuracy,
  } satisfies Omit<Lesson, "text">;
  return { ...base, text: generateLessonText(base, exercises, source.version) };
}

export function validateCurriculum(value: RawCurriculum): CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const phaseIds = new Set(value.phases.map((phase) => phase.id));
  const lessonIds = new Set<number>();
  if (value.lessonCount !== value.lessons.length)
    issues.push({ severity: "error", path: "lessonCount", message: "Không khớp số bài thực tế." });
  value.phases.forEach((phase, index) => {
    const actual = value.lessons.filter((lesson) => lesson.phase === phase.id);
    if (value.phases.findIndex((item) => item.id === phase.id) !== index)
      issues.push({ severity: "error", path: `phases[${index}].id`, message: "ID phase bị trùng." });
    if (actual.length !== phase.lessonCount)
      issues.push({ severity: "error", path: `phases[${index}].lessonCount`, message: "Không khớp số bài trong phase." });
    if (actual[0]?.id !== phase.lessonRange[0] || actual[actual.length - 1]?.id !== phase.lessonRange[1])
      issues.push({ severity: "error", path: `phases[${index}].lessonRange`, message: "Khoảng ID không khớp các bài trong phase." });
  });
  value.lessons.forEach((lesson, index) => {
    const path = `lessons[${index}]`;
    if (lessonIds.has(lesson.id)) issues.push({ severity: "error", path: `${path}.id`, message: "ID bài bị trùng." });
    lessonIds.add(lesson.id);
    if (lesson.id !== index + 1) issues.push({ severity: "error", path: `${path}.id`, message: "Thứ tự bài không liên tục." });
    if (!phaseIds.has(lesson.phase)) issues.push({ severity: "error", path: `${path}.phase`, message: "Phase không tồn tại." });
    if (lesson.target.accuracy < 0 || lesson.target.accuracy > 100)
      issues.push({ severity: "error", path: `${path}.target.accuracy`, message: "Mục tiêu accuracy ngoài 0–100." });
    if (lesson.target.wpm !== null && lesson.target.wpm <= 0)
      issues.push({ severity: "error", path: `${path}.target.wpm`, message: "Mục tiêu WPM phải dương hoặc null." });
    if (!Number.isFinite(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0)
      issues.push({ severity: "error", path: `${path}.estimatedMinutes`, message: "Thời lượng ước tính phải dương." });
    if (!lesson.exercises.length)
      issues.push({ severity: "error", path: `${path}.exercises`, message: "Bài phải có ít nhất một exercise." });
    for (const key of lesson.availableKeys) {
      if ([...key].length !== 1)
        issues.push({ severity: "error", path: `${path}.availableKeys`, message: "Mỗi phím phải là đúng một ký tự." });
    }
    for (const key of [...lesson.newKeys, ...lesson.focusKeys]) {
      if (!lesson.availableKeys.includes(key))
        issues.push({ severity: "error", path, message: `Phím ${JSON.stringify(key)} chưa có trong availableKeys.` });
    }
    lesson.exercises.forEach((exercise, exerciseIndex) => {
      if (!exerciseTypes.has(exercise.type as ExerciseType))
        issues.push({ severity: "error", path: `${path}.exercises[${exerciseIndex}].type`, message: "Loại bài tập không hỗ trợ." });
      const contentIssues = validateTypingContent(exercise.text, capabilitiesForLesson({
        phaseId: lesson.phase,
        availableKeys: lesson.availableKeys,
      }));
      const uniqueIssues = new Map(
        contentIssues.map((issue) => [`${issue.character}:${issue.reason}`, issue]),
      );
      uniqueIssues.forEach((issue) => issues.push({
        severity: "error",
        path: `${path}.exercises[${exerciseIndex}].text`,
        message: `Ký tự ${JSON.stringify(issue.character)} không hợp lệ: ${issue.reason}.`,
        lessonId: lesson.id,
        exerciseIndex,
        character: issue.character,
        physicalKey: issue.physicalKey,
        requiredModifier: issue.requiredModifier,
        reason: issue.reason,
      }));
    });
  });
  return issues;
}

export const curriculumIssues = validateCurriculum(source);
const blockingIssues = curriculumIssues.filter((issue) => issue.severity === "error");
if (blockingIssues.length)
  throw new Error(`Curriculum không hợp lệ: ${blockingIssues[0].path} — ${blockingIssues[0].message}`);

export const curriculum: Curriculum = {
  name: source.name,
  version: source.version,
  lessonCount: source.lessonCount,
  designNotes: source.designNotes,
  phases: source.phases,
  lessons: source.lessons.map((lesson) => adaptLesson(lesson, source.phases)),
};

export const lessons = curriculum.lessons;
