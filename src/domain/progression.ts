import type { Attempt, Lesson } from "./types";

export function attemptsForLessons(attempts: Attempt[], lessons: Lesson[]): Attempt[] {
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  return attempts.filter((attempt) => lessonIds.has(attempt.lessonId));
}

export function passedLessonIds(attempts: Attempt[], lessons?: Lesson[]): Set<string> {
  const relevantAttempts = lessons ? attemptsForLessons(attempts, lessons) : attempts;
  return new Set(
    relevantAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.lessonId),
  );
}

export function isLessonUnlocked(
  lesson: Lesson,
  lessons: Lesson[],
  attempts: Attempt[],
): boolean {
  if (lesson.order === 1) return true;
  const previous = lessons.find((item) => item.order === lesson.order - 1);
  return previous
    ? attempts.some(
        (attempt) => attempt.lessonId === previous.id && attempt.passed,
      )
    : false;
}

export function nextAvailableLesson(
  lessons: Lesson[],
  attempts: Attempt[],
): Lesson | undefined {
  const passed = passedLessonIds(attempts, lessons);
  return (
    lessons.find(
      (lesson) =>
        isLessonUnlocked(lesson, lessons, attempts) && !passed.has(lesson.id),
    ) ?? lessons[lessons.length - 1]
  );
}
