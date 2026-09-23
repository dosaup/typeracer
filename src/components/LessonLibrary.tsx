import {
  ArrowRight,
  Check,
  Clock3,
  Flag,
  Keyboard,
  LockKeyhole,
  Hand,
  Target,
} from "lucide-react";
import { useState } from "react";
import type { Attempt, Lesson, SpeedUnit } from "../domain/types";
import { formatSpeed } from "../domain/typing";
import { attemptsForLessons, isLessonUnlocked, nextAvailableLesson, passedLessonIds } from "../domain/progression";

export function LessonLibrary({
  lessons,
  attempts,
  speedUnit,
  lockLessons,
  onSelect,
  onOpenIntro,
}: {
  lessons: Lesson[];
  attempts: Attempt[];
  speedUnit: SpeedUnit;
  lockLessons: boolean;
  onSelect: (id: string) => void;
  onOpenIntro: () => void;
}) {
  const [phaseFilter, setPhaseFilter] = useState("all");
  const curriculumAttempts = attemptsForLessons(attempts, lessons);
  const passed = passedLessonIds(curriculumAttempts, lessons);
  const completed = new Set(curriculumAttempts.map((a) => a.lessonId));
  const recommended = nextAvailableLesson(lessons, attempts, lockLessons) ?? lessons[0];
  const phases = Array.from(
    new Map(lessons.map((lesson) => [lesson.phaseId, lesson.phaseTitle])),
  );
  const filtered = lessons.filter((lesson) => phaseFilter === "all" || lesson.phaseId === phaseFilter);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">XÂY NỀN TẢNG, TĂNG TỐC TỪNG NGÀY</div>
          <h1>
            Một lộ trình. Mười ngón tay<span className="purple-text">.</span>
          </h1>
          <p>
            Từ những phím đầu tiên đến nhịp gõ tự tin. Bắt đầu ở nơi phù hợp với
            bạn.
          </p>
        </div>
      </div>
      <section className="curriculum-banner">
        <div>
          <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>
          <h2>
            {passed.size} <span>/ {lessons.length} bài đạt mục tiêu</span>
          </h2>
          <p>
            {completed.size} bài đã hoàn thành · {lockLessons
              ? "Bài tiếp theo mở khi đạt mục tiêu bài hiện tại"
              : "Tất cả bài đang được mở để luyện tự do"}
          </p>
          <div className="curriculum-track">
            {lessons.map((l) => (
              <span key={l.id} className={passed.has(l.id) ? "done" : ""} />
            ))}
          </div>
        </div>
        <button
          className="button button-white"
          onClick={() => onSelect(recommended.id)}
        >
          Tiếp tục luyện tập <ArrowRight size={17} />
        </button>
      </section>
      <div className="library-heading">
        <div className="phase-filter">
          <label htmlFor="phase-filter">Giai đoạn</label>
          <select id="phase-filter" value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
            <option value="all">Tất cả 10 giai đoạn</option>
            {phases.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        </div>
        <span>{filtered.length} bài tập{phaseFilter === "all" || phaseFilter === "home-row" ? " + 1 hướng dẫn" : ""}</span>
      </div>
      {(phaseFilter === "all" || phaseFilter === "home-row") && (
        <section className="panel intro-path-card">
          <span className="intro-path-number">00</span>
          <span className="intro-path-icon"><Hand size={25} /></span>
          <div>
            <span className="eyebrow">BÀI HƯỚNG DẪN TƯƠNG TÁC</span>
            <h2>Đặt tay và làm quen với vùng phím</h2>
            <p>Ba hình động hướng dẫn hàng cơ sở, tay trái/phải và phím của từng ngón. Có thể xem lại bất cứ lúc nào.</p>
          </div>
          <button className="button button-secondary" onClick={onOpenIntro}>
            Xem hướng dẫn <ArrowRight size={17} />
          </button>
        </section>
      )}
      {phases.filter(([id]) => phaseFilter === "all" || phaseFilter === id).map(([phaseId, phaseTitle]) => (
        <section className="phase-section" key={phaseId}>
          <div className="section-line phase-heading">
            <div>
              <span className="eyebrow">GIAI ĐOẠN {phases.findIndex(([id]) => id === phaseId) + 1}</span>
              <h2>{phaseTitle}</h2>
            </div>
            <span>{filtered.filter((lesson) => lesson.phaseId === phaseId).length} bài</span>
          </div>
          <div className="lesson-grid">
        {filtered.filter((lesson) => lesson.phaseId === phaseId).map((lesson) => {
          const lessonAttempts = attempts.filter((a) => a.lessonId === lesson.id);
          const bestWpm = lessonAttempts.reduce((best, attempt) => Math.max(best, attempt.wpm), 0);
          const bestAccuracy = lessonAttempts.reduce((best, attempt) => Math.max(best, attempt.accuracy), 0);
          const mastered = passed.has(lesson.id);
          const unlocked = isLessonUnlocked(lesson, lessons, attempts, lockLessons);
          const inProgress = unlocked && completed.has(lesson.id) && !mastered;
          return (
            <article
              key={lesson.id}
              className={`panel lesson-card ${mastered ? "mastered" : ""} ${!unlocked ? "locked" : ""}`}
            >
              <div className="section-line">
                <span className="lesson-card-number">
                  {String(lesson.order).padStart(2, "0")}
                </span>
                <span
                  className={`level-badge ${mastered ? "green-badge" : ""}`}
                >
                  {mastered ? (
                    <>
                      <Check size={13} /> Đã đạt
                    </>
                  ) : !unlocked ? <><LockKeyhole size={13} /> Đã khóa</> : inProgress ? "Đang luyện" : "Sẵn sàng"}
                </span>
              </div>
              <h2>{lesson.title}</h2>
              <p>{lesson.description}</p>
              <div className="lesson-key-chips">
                {lesson.keys.slice(0, 7).map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
                {lesson.keys.length > 7 && (
                  <span>+{lesson.keys.length - 7}</span>
                )}
              </div>
              <div className="lesson-card-meta">
                <span>
                  <Target size={14} />
                  {lesson.targetAccuracy}% chính xác
                </span>
                <span><Clock3 size={14} />{lesson.estimatedMinutes} phút</span>
                {lesson.targetWpm !== null && <span>{formatSpeed(lesson.targetWpm, speedUnit)}</span>}
              </div>
              <div className="lesson-card-bottom">
                <span>
                  {lessonAttempts.length ? (
                    `Tốt nhất: ${formatSpeed(bestWpm, speedUnit)} · ${bestAccuracy.toFixed(1)}%`
                  ) : (
                    <>
                      <Keyboard size={14} /> Chưa luyện tập
                    </>
                  )}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Luyện bài ${lesson.title}`}
                  onClick={() => onSelect(lesson.id)}
                  disabled={!unlocked}
                >
                  {unlocked ? <ArrowRight size={20} /> : <LockKeyhole size={18} />}
                </button>
              </div>
            </article>
          );
        })}
          </div>
        </section>
      ))}
      <p className="library-note">
        <Flag size={16} /> Bài đầu ưu tiên độ chính xác. Với bài có mục tiêu tốc độ,
        cần đạt cả WPM và độ chính xác để mở bài tiếp theo.
      </p>
    </>
  );
}
