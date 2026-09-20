import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { capabilitiesForLesson, generateExercise, validateTypingContent, type TypingContentIssue } from "../src/domain/exercise";
import type { ExerciseType, LessonExercise } from "../src/domain/types";

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
  exercises: Array<{ type: ExerciseType; text: string; durationSeconds?: number }>;
}

interface RawCurriculum {
  version: number;
  lessonCount: number;
  lessons: RawLesson[];
}

interface ExerciseReport {
  lesson: RawLesson;
  exerciseIndex: number;
  exercise: RawLesson["exercises"][number];
  issues: TypingContentIssue[];
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const curriculumPath = resolve(root, "src/data/curriculum.json");
const reportPath = resolve(root, "docs/curriculum-validation-report.md");
const shouldFix = process.argv.includes("--fix");
const curriculum = JSON.parse(readFileSync(curriculumPath, "utf8")) as RawCurriculum;

function scan(): ExerciseReport[] {
  return curriculum.lessons.flatMap((lesson) => lesson.exercises.flatMap((exercise, exerciseIndex) => {
    const issues = validateTypingContent(exercise.text, capabilitiesForLesson({
      phaseId: lesson.phase,
      availableKeys: lesson.availableKeys,
    }));
    return issues.length ? [{ lesson, exerciseIndex, exercise, issues }] : [];
  }));
}

function distinctIssues(issues: TypingContentIssue[]): TypingContentIssue[] {
  const unique = new Map<string, TypingContentIssue>();
  for (const issue of issues) unique.set(`${issue.character}:${issue.reason}`, issue);
  return [...unique.values()];
}

function issueReason(issue: TypingContentIssue): string {
  switch (issue.reason) {
    case "unsupported-character": return "ký tự chưa có trong ánh xạ QWERTY";
    case "physical-key-unavailable": return "phím vật lý chưa được mở khóa";
    case "modifier-unavailable": return "Shift chưa được mở khóa";
    case "capability-unavailable": return "ký tự tạo ra chưa được curriculum cho phép";
  }
}

function formatReport(before: ExerciseReport[], after: ExerciseReport[]): string {
  const lines = [
    "# Báo cáo kiểm tra curriculum",
    "",
    `- Curriculum: ${curriculum.lessonCount} bài, ${curriculum.lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0)} exercise.`,
    `- Trước chuẩn hóa: ${before.length} exercise có nội dung không hợp lệ.`,
    `- Sau chuẩn hóa: ${after.length} exercise có nội dung không hợp lệ.`,
    "- Mỗi mục bên dưới được nhóm theo bài → exercise → ký tự vi phạm.",
    "",
    "## Các lỗi được phát hiện trước khi chuẩn hóa",
    "",
  ];

  for (const item of before) {
    lines.push(`### Bài ${item.lesson.id}: ${item.lesson.title} — exercise ${item.exerciseIndex + 1} (${item.exercise.type})`, "");
    for (const issue of distinctIssues(item.issues)) {
      lines.push(
        `- Ký tự: \`${issue.character.replace(/`/g, "\\`")}\`; phím vật lý: \`${issue.physicalKey ?? "không xác định"}\`; modifier: ${issue.requiredModifier ?? "không"}; lý do: ${issueReason(issue)}.`,
      );
    }
    lines.push("");
  }

  lines.push("## Kết quả hiện tại", "");
  if (!after.length) lines.push("PASS — toàn bộ nội dung tĩnh của 250 bài đều hợp lệ theo capability tại thời điểm bài xuất hiện.");
  else lines.push(`FAIL — còn ${after.length} exercise không hợp lệ.`);
  lines.push("");
  return lines.join("\n");
}

const before = scan();
if (shouldFix) {
  for (const item of before) {
    const lesson = item.lesson;
    item.exercise.text = generateExercise({
      lesson: {
        id: `lesson-${lesson.id}`,
        phaseId: lesson.phase,
        newKeys: lesson.newKeys,
        focusKeys: lesson.focusKeys,
        availableKeys: lesson.availableKeys,
      },
      exercise: item.exercise as LessonExercise,
      seed: `data-fix:${curriculum.version}:${lesson.id}:${item.exerciseIndex}`,
    });
  }
  writeFileSync(curriculumPath, `${JSON.stringify(curriculum, null, 2)}\n`);
}

const after = scan();
let structuralIssueCount = 0;
if (!after.length) {
  const { curriculumIssues } = await import("../src/data/curriculum");
  structuralIssueCount = curriculumIssues.length;
}
if (shouldFix) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, formatReport(before, after));
}

console.log(`Curriculum: ${curriculum.lessonCount} lessons.`);
console.log(`Invalid exercises before: ${before.length}.`);
console.log(`Invalid exercises after: ${after.length}.`);
console.log(`Structural/metadata issues: ${structuralIssueCount}.`);
if (shouldFix) console.log(`Report: ${reportPath}`);
if (after.length || structuralIssueCount) process.exitCode = 1;
