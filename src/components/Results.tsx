import {
  ArrowRight,
  Check,
  CircleAlert,
  RefreshCw,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { Attempt, Lesson, SpeedUnit } from "../domain/types";
import { formatSpeed, formatTime, keyLabel } from "../domain/typing";

export type SaveStatus = "saving" | "saved" | "error";

export function Results({
  result,
  lesson,
  previousBest,
  previousBestAccuracy,
  saveStatus,
  saveError,
  onSaveAgain,
  onRetry,
  onNext,
  timedOut,
  place,
  speedUnit,
}: {
  result: Attempt;
  lesson: Lesson;
  previousBest: number;
  previousBestAccuracy: number;
  saveStatus: SaveStatus;
  saveError: string;
  onSaveAgain: () => void;
  onRetry: () => void;
  onNext?: () => void;
  timedOut: boolean;
  place: number | null;
  speedUnit: SpeedUnit;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const errors = new Map<
    string,
    { total: number; actual: Map<string, number> }
  >();
  for (const mistake of result.mistakes) {
    const group = errors.get(mistake.expected) ?? {
      total: 0,
      actual: new Map<string, number>(),
    };
    group.total++;
    group.actual.set(
      mistake.actual,
      (group.actual.get(mistake.actual) ?? 0) + 1,
    );
    errors.set(mistake.expected, group);
  }
  const sortedErrors = [...errors].sort((a, b) => b[1].total - a[1].total);
  return (
    <section className="results panel">
      <div className="result-celebration" aria-hidden="true">
        <Trophy size={40} />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="eyebrow purple-text">
        {timedOut ? "ĐƯỜNG ĐUA ĐÃ HẾT GIỜ" : "ĐƯỜNG ĐUA ĐÃ HOÀN THÀNH"}
      </span>
      <h2 tabIndex={-1} ref={heading}>
        {timedOut ? "Hết giờ — mình thử lại nhé!" : "Về đích rồi. Giỏi lắm!"}
      </h2>
      <p>
        {timedOut
          ? `Bạn đã hoàn thành ${result.characters}/${lesson.text.length} ký tự của bài “${lesson.title}”. `
          : `Bạn đã gõ hết bài “${lesson.title}”. `}
        {!timedOut && result.passed
          ? "Bạn đã đạt mục tiêu của bài!"
          : "Thêm một lần luyện tập, thêm một bước tiến."}
      </p>
      {!timedOut && previousBest > 0 && result.wpm > previousBest && (
        <span className="personal-best">
          <Trophy size={14} /> Kỷ lục tốc độ mới của bài này!
        </span>
      )}
      {!timedOut && previousBestAccuracy > 0 && result.accuracy > previousBestAccuracy && (
        <span className="personal-best">
          <Trophy size={14} /> Kỷ lục độ chính xác mới của bài này!
        </span>
      )}
      <div className={`result-metrics ${place ? "result-metrics--ranked" : ""}`}>
        {place && (
          <div>
            <strong>#{place}</strong>
            <span>Thứ hạng</span>
          </div>
        )}
        <div>
          <strong>
            {formatSpeed(result.wpm, speedUnit)}
          </strong>
          <span>Tốc độ gõ</span>
        </div>
        <div>
          <strong>{formatSpeed(result.rawWpm ?? result.wpm, speedUnit)}</strong>
          <span>Tốc độ thô</span>
        </div>
        <div>
          <strong>
            {result.accuracy.toFixed(1)}
            <small>%</small>
          </strong>
          <span>Độ chính xác</span>
        </div>
        <div>
          <strong>{formatTime(result.durationMs)}</strong>
          <span>Thời gian</span>
        </div>
        <div>
          <strong>{result.mistakes.length}</strong>
          <span>Lần gõ sai</span>
        </div>
      </div>
      <div className="result-targets">
        {lesson.targetWpm !== null && (
          <span className={result.wpm >= lesson.targetWpm ? "target-met" : ""}>
            {result.wpm >= lesson.targetWpm ? <Check size={16} /> : <CircleAlert size={16} />}{" "}
            Tốc độ ≥ {formatSpeed(lesson.targetWpm, speedUnit)}
          </span>
        )}
        <span
          className={
            result.accuracy >= lesson.targetAccuracy ? "target-met" : ""
          }
        >
          {result.accuracy >= lesson.targetAccuracy ? (
            <Check size={16} />
          ) : (
            <CircleAlert size={16} />
          )}{" "}
          Chính xác ≥ {lesson.targetAccuracy}%
        </span>
      </div>
      <div className="mistake-review">
        <div className="section-line">
          <h3>
            {sortedErrors.length
              ? "Những phím cần chăm chút"
              : "Không có phím nào gõ sai!"}
          </h3>
          <span>
            {sortedErrors.length
              ? `${sortedErrors.length} phím`
              : "Tiếp tục giữ phong độ nhé"}
          </span>
        </div>
        {sortedErrors.length > 0 && (
          <div className="mistake-list">
            {sortedErrors.map(([key, detail]) => (
              <div className="mistake-item" key={key}>
                <kbd>{keyLabel(key)}</kbd>
                <div>
                  <strong>{detail.total} lần sai</strong>
                  <span>
                    Đã gõ:{" "}
                    {[...detail.actual]
                      .map(
                        ([actual, count]) => `${keyLabel(actual)} (${count})`,
                      )
                      .join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        className={`save-notice ${saveStatus === "error" ? "error" : ""}`}
        role="status"
      >
        {saveStatus === "saved" ? (
          <>
            <Check size={15} /> Đã lưu kết quả trên thiết bị này
          </>
        ) : saveStatus === "saving" ? (
          <>
            <RefreshCw className="spin" size={15} /> Đang lưu kết quả…
          </>
        ) : (
          <>
            <CircleAlert size={16} />
            <span>{saveError}</span>
            <button onClick={onSaveAgain}>Thử lưu lại</button>
          </>
        )}
      </div>
      <div className="result-actions">
        <button
          className="button button-secondary"
          onClick={onRetry}
          disabled={saveStatus === "saving"}
        >
          <RotateCcw size={16} /> Luyện lại
        </button>
        {onNext && (
          <button
            className="button button-primary"
            onClick={onNext}
            disabled={saveStatus === "saving"}
          >
            Bài tiếp theo <ArrowRight size={17} />
          </button>
        )}
      </div>
      <p className="metric-note">
        WPM là số từ chuẩn 5 ký tự mỗi phút; CPM là số ký tự mỗi phút. Độ chính
        xác tính trên mọi lần gõ, kể cả lỗi đã sửa. Thời gian tạm dừng không tính.
      </p>
    </section>
  );
}
