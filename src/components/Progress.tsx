import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Crosshair,
  Gauge,
  Keyboard,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import type { Attempt, Lesson, SpeedUnit } from "../domain/types";
import {
  formatTime,
  formatSpeed,
  keyLabel,
  localDateKey,
  wpmOf,
} from "../domain/typing";
import { attemptsForLessons, passedLessonIds } from "../domain/progression";

export function Progress({
  lessons,
  attempts,
  speedUnit,
  onSelect,
  onPractice,
}: {
  lessons: Lesson[];
  attempts: Attempt[];
  speedUnit: SpeedUnit;
  onSelect: (id: string) => void;
  onPractice: () => void;
}) {
  const [shown, setShown] = useState(10);
  const curriculumAttempts = attemptsForLessons(attempts, lessons);
  const totalMs = curriculumAttempts.reduce((total, a) => total + a.durationMs, 0);
  const totalChars = curriculumAttempts.reduce((total, a) => total + a.characters, 0);
  const totalKeys = curriculumAttempts.reduce((total, a) => total + a.keystrokes, 0);
  const correctKeys = curriculumAttempts.reduce(
    (total, a) => total + a.correctKeystrokes,
    0,
  );
  const passed = passedLessonIds(curriculumAttempts, lessons);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const daily = curriculumAttempts.filter(
      (a) => localDateKey(new Date(a.completedAt)) === localDateKey(day),
    );
    return {
      date: day,
      count: daily.length,
      wpm: wpmOf(
        daily.reduce((s, a) => s + a.characters, 0),
        daily.reduce((s, a) => s + a.durationMs, 0),
      ),
    };
  });
  const maximum = Math.max(40, ...days.map((day) => day.wpm));
  const errors = new Map<string, number>();
  curriculumAttempts.forEach((a) =>
    a.mistakes.forEach((m) =>
      errors.set(m.expected, (errors.get(m.expected) ?? 0) + 1),
    ),
  );
  const commonErrors = [...errors].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <>
      <div className="stats-grid">
        <div className="panel stat-card">
          <span>
            <Gauge size={18} />
            Tốc độ trung bình
          </span>
          <strong>
            {formatSpeed(wpmOf(totalChars, totalMs), speedUnit)}
          </strong>
          <p>Tính theo tổng thời gian luyện</p>
        </div>
        <div className="panel stat-card">
          <span>
            <Crosshair size={18} />
            Độ chính xác
          </span>
          <strong>
            {totalKeys ? ((correctKeys / totalKeys) * 100).toFixed(1) : "—"}
            <small>{totalKeys ? "%" : ""}</small>
          </strong>
          <p>Trên tất cả lần gõ</p>
        </div>
        <div className="panel stat-card">
          <span>
            <Trophy size={18} />
            Bài đạt mục tiêu
          </span>
          <strong>
            {passed.size}
            <small> / {lessons.length}</small>
          </strong>
          <p>{curriculumAttempts.length} lượt luyện hoàn thành</p>
        </div>
        <div className="panel stat-card">
          <span>
            <Clock3 size={18} />
            Thời gian luyện
          </span>
          <strong>
            {Math.round(totalMs / 60_000)}
            <small> phút</small>
          </strong>
          <p>Không tính thời gian tạm dừng</p>
        </div>
      </div>
      {curriculumAttempts.length === 0 ? (
        <section className="panel empty-progress">
          <div className="empty-icon">
            <BarChart3 size={30} />
          </div>
          <h2>Hành trình của bạn bắt đầu từ đây</h2>
          <p>
            Hoàn thành bài tập đầu tiên để xem tốc độ, độ chính xác và những
            phím cần luyện thêm.
          </p>
          <button className="button button-primary" onClick={onPractice}>
            Bắt đầu bài đầu tiên <ArrowRight size={17} />
          </button>
        </section>
      ) : (
        <>
          <div className="progress-middle">
            <section className="panel chart-card">
              <div className="section-line">
                <div>
                  <h2>Nhịp gõ 7 ngày qua</h2>
                  <p>Tốc độ trung bình theo ngày · {speedUnit.toUpperCase()}</p>
                </div>
                <span className="chart-label">
                  <i />
                  Tốc độ gõ
                </span>
              </div>
              <div
                className="bar-chart"
                role="img"
                aria-label={days
                  .map(
                    (day) =>
                      `${day.date.toLocaleDateString("vi-VN")}: ${formatSpeed(day.wpm, speedUnit)}, ${day.count} lượt`,
                  )
                  .join("; ")}
              >
                {days.map((day, index) => (
                  <div
                    className={`chart-column ${index === 6 ? "today" : ""}`}
                    key={localDateKey(day.date)}
                  >
                    <span>{day.count ? Math.round(speedUnit === "wpm" ? day.wpm : day.wpm * 5) : "—"}</span>
                    <div className="bar-slot">
                      <div
                        className="chart-bar"
                        style={{
                          height: day.count
                            ? `${Math.max(3, (day.wpm / maximum) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span>
                      {index === 6
                        ? "Hôm nay"
                        : `${day.date.getDate()}/${day.date.getMonth() + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel error-card">
              <h2>Phím cần luyện thêm</h2>
              <p>Các phím thường gõ nhầm nhất</p>
              {commonErrors.length ? (
                <div className="error-ranking">
                  {commonErrors.map(([key, count]) => (
                    <div key={key}>
                      <kbd>{keyLabel(key)}</kbd>
                      <span className="error-bar">
                        <i
                          style={{
                            width: `${(count / commonErrors[0][1]) * 100}%`,
                          }}
                        />
                      </span>
                      <strong>{count} lần</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-errors">
                  <Check size={25} />
                  <p>
                    Chưa có lỗi gõ nào.
                    <br />
                    Giữ nhịp thật tốt!
                  </p>
                </div>
              )}
            </section>
          </div>
          <section className="panel history-card">
            <div className="section-line">
              <h2>Lịch sử luyện tập</h2>
              <span>{curriculumAttempts.length} lượt hoàn thành</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th>Thời điểm</th>
                    <th>Tốc độ</th>
                    <th>Chính xác</th>
                    <th>Thời gian</th>
                    <th>Kết quả</th>
                    <th>
                      <span className="sr-only">Luyện lại</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {curriculumAttempts.slice(0, shown).map((attempt) => {
                    const lesson = lessons.find(
                      (l) => l.id === attempt.lessonId,
                    );
                    return (
                      <tr key={attempt.id}>
                        <td>
                          <span className="history-lesson">
                            <Keyboard size={15} />
                            {lesson?.title ?? "Bài tập đã lưu"}
                          </span>
                        </td>
                        <td>
                          {new Date(attempt.completedAt).toLocaleString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </td>
                        <td>
                          <strong>{formatSpeed(attempt.wpm, speedUnit)}</strong>
                        </td>
                        <td>{attempt.accuracy.toFixed(1)}%</td>
                        <td>{formatTime(attempt.durationMs)}</td>
                        <td>
                          <span
                            className={`level-badge ${attempt.passed ? "green-badge" : ""}`}
                          >
                            {attempt.passed ? "Đã đạt" : "Cần luyện thêm"}
                          </span>
                        </td>
                        <td>
                          {lesson && (
                            <button
                              className="icon-button"
                              aria-label={`Luyện lại ${lesson.title}`}
                              onClick={() => onSelect(lesson.id)}
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {shown < curriculumAttempts.length && (
              <button
                className="text-button history-more"
                onClick={() => setShown((n) => n + 10)}
              >
                Xem thêm 10 kết quả
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}
