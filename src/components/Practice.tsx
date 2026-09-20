import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Crosshair,
  Gauge,
  Hand,
  Lightbulb,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Attempt, KeyboardPlatform, Lesson, Preferences } from "../domain/types";
import { accuracyOf, formatSpeed, formatTime, wpmOf } from "../domain/typing";
import { isLessonUnlocked } from "../domain/progression";
import { fingerNames, guideFor, handNames } from "../domain/keyboard";
import { useTypingSession } from "../hooks/useTypingSession";
import { HandDiagram, Keyboard } from "./Keyboard";
import { RaceTrack } from "./RaceTrack";
import { Results, type SaveStatus } from "./Results";
import { TypingIntro } from "./TypingIntro";

export function Practice({
  lesson,
  lessons,
  attempts,
  preferences,
  keyboardPlatform,
  preferencesBusy,
  onPreferences,
  onSave,
  onResetProgress,
  onSelect,
  onRestart,
  onBusyChange,
  onOpenLessons,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  attempts: Attempt[];
  preferences: Preferences;
  keyboardPlatform: KeyboardPlatform;
  preferencesBusy: boolean;
  onPreferences: (patch: Partial<Preferences>) => void;
  onSave: (result: Attempt) => Promise<void>;
  onResetProgress: (lessonId: string) => Promise<void>;
  onSelect: (id: string) => void;
  onRestart: () => void;
  onBusyChange: (busy: boolean) => void;
  onOpenLessons: () => void;
}) {
  const [pace] = useState(() => {
    const duration = attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0);
    const characters = attempts.reduce((sum, attempt) => sum + attempt.characters, 0);
    return { hasHistory: duration > 0, wpm: duration > 0 ? wpmOf(characters, duration) : (lesson.targetWpm ?? 10) };
  });
  const timeLimitMs = lesson.estimatedMinutes * 60_000;
  const session = useTypingSession(lesson, preferences.sound, timeLimitMs);
  const {
    state,
    status,
    elapsed,
    wrongCode,
    result,
    start,
    pause,
    input,
    resumeOnTyping,
    countdown,
    currentWpm,
    endReason,
  } = session;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saving");
  const [saveError, setSaveError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [showIntro, setShowIntro] = useState(
    lesson.type === "intro" && !preferences.introSeen,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeToastMessages = useRef(new Map<string, string>());
  const textarea = useRef<HTMLTextAreaElement>(null);
  const activeCharacter = useRef<HTMLSpanElement>(null);
  const typingText = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const alive = useRef(true);
  const previousBest = useRef(
    attempts.reduce(
      (best, attempt) =>
        attempt.lessonId === lesson.id ? Math.max(best, attempt.wpm) : best,
      0,
    ),
  );
  const previousBestAccuracy = useRef(
    attempts.reduce(
      (best, attempt) =>
        attempt.lessonId === lesson.id ? Math.max(best, attempt.accuracy) : best,
      0,
    ),
  );
  const guide = guideFor(lesson.text[state.position] ?? "");
  const accuracy = accuracyOf(state);
  const percent = state.position / lesson.text.length;
  const remaining = Math.max(0, timeLimitMs - elapsed);
  const averageFinishMs = lesson.text.length / 5 / Math.max(1, pace.wpm) * 60_000;
  const finishPlace = endReason === "finished" && result
    ? result.durationMs <= averageFinishMs ? 1 : 2
    : null;
  const nextLesson = lessons.find((item) => item.order === lesson.order + 1);
  const nextLessonUnlocked = nextLesson
    ? isLessonUnlocked(nextLesson, lessons, attempts) || result?.passed === true
    : false;
  const busy =
    status === "countdown" ||
    status === "running" ||
    (status === "paused" && (state.keystrokes > 0 || elapsed > 0)) ||
    (result !== null && saveStatus !== "saved");
  const progressWriteBusy = resetBusy || (result !== null && saveStatus === "saving");

  useLayoutEffect(() => {
    if (status === "countdown" || status === "running") {
      textarea.current?.focus({ preventScroll: true });
    }
  }, [status]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      toastTimers.current.forEach(clearTimeout);
      toastTimers.current.clear();
      activeToastMessages.current.clear();
    };
  }, []);
  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    for (const [message, toastId] of activeToastMessages.current) {
      if (toastId === id) activeToastMessages.current.delete(message);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback((message: string) => {
    if (activeToastMessages.current.has(message)) return;
    const id = crypto.randomUUID();
    activeToastMessages.current.set(message, id);
    setToasts((current) => [...current, { id, message }]);
    toastTimers.current.set(id, setTimeout(() => {
      toastTimers.current.delete(id);
      activeToastMessages.current.delete(message);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000));
  }, []);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!busy) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [busy]);
  const keepCurrentCharacterVisible = useCallback(() => {
    const current = activeCharacter.current;
    const parent = typingText.current;
    if (!current || !parent) return;
    const currentTop = current.offsetTop;
    const currentBottom = currentTop + current.offsetHeight;
    const viewportTop = parent.scrollTop;
    const viewportBottom = viewportTop + parent.clientHeight;
    if (currentTop < viewportTop) parent.scrollTop = currentTop;
    else if (currentBottom > viewportBottom)
      parent.scrollTop = currentBottom - parent.clientHeight;
  }, []);

  useLayoutEffect(keepCurrentCharacterVisible, [
    state.position,
    keepCurrentCharacterVisible,
  ]);

  useEffect(() => {
    const parent = typingText.current;
    if (!parent) return;
    // Recenter after viewport changes, text wrapping, fonts loading or toggling hands.
    const observer = new ResizeObserver(keepCurrentCharacterVisible);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [result, keepCurrentCharacterVisible]);

  const save = useCallback(
    async (attempt: Attempt) => {
      setSaveStatus("saving");
      try {
        await onSave(attempt);
        if (alive.current) setSaveStatus("saved");
      } catch (error) {
        if (alive.current) {
          setSaveStatus("error");
          setSaveError(
            error instanceof Error
              ? error.message
              : "Chưa lưu được kết quả. Vui lòng thử lại.",
          );
        }
      }
    },
    [onSave],
  );
  useEffect(() => {
    if (result) void save(result);
  }, [result, save]);

  function focusAndStart() {
    composing.current = false;
    if (textarea.current) textarea.current.value = "";
    start();
    textarea.current?.focus({ preventScroll: true });
  }

  async function resetProgress() {
    if (
      !window.confirm(
        `Xóa toàn bộ kết quả đã lưu của bài “${lesson.title}” và làm lại từ đầu?`,
      )
    ) return;
    setResetBusy(true);
    try {
      await onResetProgress(lesson.id);
    } catch {
      showToast("Chưa thể đặt lại tiến độ. Hãy thử lại.");
    } finally {
      if (alive.current) setResetBusy(false);
    }
  }

  const nearby = lessons.slice(Math.max(0, lesson.order - 1), lesson.order + 2);
  if (showIntro) {
    return (
      <div className="practice-screen practice-screen--intro">
        <TypingIntro
          keyboardPlatform={keyboardPlatform}
          onBegin={() => {
            onPreferences({ introSeen: true });
            setShowIntro(false);
          }}
        />
      </div>
    );
  }
  return (
    <div
      className={`practice-screen ${result ? "practice-screen--result" : "practice-screen--active"}`}
    >
      <div className="toast-region" aria-label="Thông báo">
        {toasts.map((toast) => (
          <div className="app-toast" role="status" key={toast.id}>
            <CircleAlert size={18} />
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      {settingsOpen && (
        <div className="lesson-settings-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section
            className="lesson-settings-dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-line">
              <div>
                <span className="eyebrow">BÀI {lesson.order}</span>
                <h2 id="lesson-settings-title">Cài đặt bài luyện</h2>
              </div>
              <button className="icon-button" aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
            </div>
            <p>Đặt lại lượt hiện tại hoặc xóa riêng lịch sử của “{lesson.title}”.</p>
            <div className="lesson-settings-actions">
              <button className="button button-secondary" onClick={() => { setSettingsOpen(false); onRestart(); }}>
                <RotateCcw size={16} /> Đặt lại lượt đang tập
              </button>
              <button className="button lesson-reset-button" disabled={progressWriteBusy} onClick={() => void resetProgress()}>
                <RotateCcw size={16} /> {resetBusy ? "Đang đặt lại…" : "Xóa tiến độ bài này"}
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="practice-layout">
        <div className="practice-main">
          <RaceTrack
            progress={percent}
            currentWpm={currentWpm}
            averageWpm={pace.wpm}
            elapsed={elapsed}
            characters={lesson.text.length}
            hasHistory={pace.hasHistory}
            running={status === "running"}
            countdown={countdown}
            showStart={status === "running" && elapsed < 750 && state.position === 0}
            speedUnit={preferences.speedUnit}
          />
          {result ? (
            <Results
              result={result}
              lesson={lesson}
              previousBest={previousBest.current}
              previousBestAccuracy={previousBestAccuracy.current}
              saveStatus={saveStatus}
              saveError={saveError}
              onSaveAgain={() => void save(result)}
              onRetry={onRestart}
              onNext={endReason !== "timeout" && nextLesson && nextLessonUnlocked ? () => onSelect(nextLesson.id) : undefined}
              timedOut={endReason === "timeout"}
              place={finishPlace}
              speedUnit={preferences.speedUnit}
            />
          ) : (
            <section className="typing-workspace panel">
              <div className="live-metrics">
                <div>
                  <Gauge size={17} />
                  <span>Nhịp hiện tại</span>
                  <strong>
                    {formatSpeed(currentWpm, preferences.speedUnit)}
                  </strong>
                </div>
                <div>
                  <Crosshair size={17} />
                  <span>Chính xác</span>
                  <strong>
                    {Math.round(accuracy)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <Clock3 size={17} />
                  <span>Còn lại</span>
                  <strong>{formatTime(Math.ceil(remaining / 1000) * 1000)}</strong>
                </div>
                <button
                  className="icon-button"
                  title="Luyện lại từ đầu"
                  aria-label="Luyện lại từ đầu"
                  onClick={onRestart}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div
                className={`typing-area ${wrongCode ? "has-error" : ""}`}
                onClick={() => {
                  if (status === "paused") focusAndStart();
                  else textarea.current?.focus({ preventScroll: true });
                }}
              >
                <div className="typing-status">
                  <span
                    className={`status-pill ${status === "running" ? "status-running" : ""}`}
                  >
                    <span />
                    {status === "ready"
                      ? "Sẵn sàng xuất phát"
                      : status === "countdown"
                        ? "Chuẩn bị xuất phát"
                      : status === "paused"
                        ? "Đã tạm dừng"
                        : "Đang luyện tập"}
                  </span>
                  <span>
                    {state.position}/{lesson.text.length} ký tự
                  </span>
                </div>
                <div className={`typing-stage ${preferences.showHands ? "with-hands" : ""}`}>
                {preferences.showHands && <HandDiagram hand="left" guide={guide}/>}
                <div className="typing-passage">
                <div
                  ref={typingText}
                  className="typing-text"
                  aria-hidden="true"
                >
                  {[...lesson.text].map((char, index) => (
                    <span
                      ref={
                        index === state.position ? activeCharacter : undefined
                      }
                      key={index}
                      className={`${index < state.position ? "char-correct" : ""} ${index === state.position ? `char-current ${char === " " ? "char-current-space" : ""} ${wrongCode ? "char-error" : ""}` : ""}`}
                    >
                      {char}
                    </span>
                  ))}
                </div>
                </div>
                {preferences.showHands && <HandDiagram hand="right" guide={guide}/>}
                </div>
                <textarea
                  ref={textarea}
                  className="typing-capture"
                  // Let the browser own its IME buffer until composition ends.
                  defaultValue=""
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Vùng luyện gõ. ${lesson.description}`}
                  aria-describedby="typing-instructions typing-accessible-text"
                  onBlur={(event) => {
                    composing.current = false;
                    event.currentTarget.value = "";
                    pause("focus");
                  }}
                  onKeyDown={(event) => {
                    const isCapsLockOn = event.getModifierState("CapsLock");
                    if (isCapsLockOn && !capsLock) {
                      showToast("Caps Lock đang bật. Tắt Caps Lock để gõ đúng chữ thường.");
                    }
                    setCapsLock(isCapsLockOn);
                    if (event.key === "Escape") {
                      event.preventDefault();
                      pause();
                      return;
                    }
                    if (event.ctrlKey || event.altKey || event.metaKey) return;
                    if (
                      event.nativeEvent.isComposing ||
                      // Some IMEs use 229 on their boundary keydown even when
                      // isComposing is false. Do not count that commit key.
                      event.nativeEvent.keyCode === 229 ||
                      event.key === "Dead" ||
                      event.key === "Process"
                    ) {
                      showToast(
                        "Hãy chuyển bộ gõ sang English / ABC để luyện ký tự Latin.",
                      );
                      return;
                    }
                    if (event.key.length === 1 || event.key === "Backspace") {
                      event.preventDefault();
                      // The new native key event is authoritative: switching
                      // input sources can leave a composition without its end.
                      composing.current = false;
                      event.currentTarget.value = "";
                      if (!event.repeat) {
                        input(event.key, event.code);
                      }
                    }
                  }}
                  onInput={(event) => {
                    const native = event.nativeEvent as InputEvent;
                    if (
                      native.isComposing ||
                      native.inputType?.includes("Composition")
                    )
                      return;
                    const value = event.currentTarget.value;
                    if (!composing.current && [...value].length === 1) {
                      input(value, guideFor(value)?.code ?? "Unknown");
                    }
                    event.currentTarget.value = "";
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    showToast(
                      "Hãy gõ từng phím để luyện tập; không dán văn bản vào bài.",
                    );
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    showToast(
                      "Hãy gõ từng phím để luyện tập; không kéo thả nội dung vào bài.",
                    );
                  }}
                  onCompositionStart={() => {
                    composing.current = true;
                    showToast(
                      "Bài tập dùng ký tự Latin. Chuyển bộ gõ sang English / ABC rồi tiếp tục nhé.",
                    );
                  }}
                  onCompositionEnd={(event) => {
                    composing.current = false;
                    event.currentTarget.value = "";
                  }}
                />
                <p id="typing-accessible-text" className="sr-only">
                  Nội dung bài: {lesson.text}
                </p>
                <div
                  className="typing-controls"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span id="typing-instructions">
                    {status === "running"
                      ? "Gõ phím đang sáng · Esc để tạm dừng"
                      : status === "countdown"
                        ? "Đếm ngược 5 giây · Esc để dừng"
                      : status === "paused"
                        ? resumeOnTyping
                          ? "Gõ phím tiếp theo để tiếp tục."
                          : "Thả lỏng tay rồi tiếp tục nhé."
                        : "Nhấn bắt đầu hoặc bấm vào đoạn chữ để gõ."}
                  </span>
                  <button
                    className={`button ${status === "running" || status === "countdown" ? "button-secondary" : "button-primary"} button-small`}
                    // Keep blur from pausing before the click, which would otherwise resume.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() =>
                      status === "running" || status === "countdown" ? pause() : focusAndStart()
                    }
                  >
                    {status === "running" || status === "countdown" ? (
                      <>
                        <Pause size={14} /> Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        {status === "paused" ? "Tiếp tục" : "Bắt đầu"}
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="keyboard-topline">
                <span>
                  Phím tiếp theo{" "}
                  <kbd className="next-key">
                    {guide?.key === " " ? "Space" : lesson.text[state.position]}
                  </kbd>
                  {guide?.shift && (
                    <>
                      <span>+</span>
                      <kbd>
                        Shift {guide.shift === "left" ? "trái" : "phải"}
                      </kbd>
                    </>
                  )}
                  {guide && <span className="next-finger">{fingerNames[guide.finger]} · {handNames[guide.hand]}</span>}
                </span>
                <div>
                  <button
                    className="icon-button"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Mở cài đặt bài luyện"
                    aria-expanded={settingsOpen}
                  >
                    <Settings2 size={17} />
                  </button>
                  <button
                    className={`icon-button ${preferences.showHands ? "is-on" : ""}`}
                    onClick={() =>
                      onPreferences({ showHands: !preferences.showHands })
                    }
                    aria-label={
                      preferences.showHands
                        ? "Ẩn hướng dẫn bàn tay"
                        : "Hiện hướng dẫn bàn tay"
                    }
                    aria-pressed={preferences.showHands}
                    disabled={preferencesBusy}
                  >
                    <Hand size={17} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onPreferences({ sound: !preferences.sound })}
                    aria-label={
                      preferences.sound ? "Tắt âm báo lỗi" : "Bật âm báo lỗi"
                    }
                    aria-pressed={preferences.sound}
                    disabled={preferencesBusy}
                  >
                    {preferences.sound ? (
                      <Volume2 size={17} />
                    ) : (
                      <VolumeX size={17} />
                    )}
                  </button>
                </div>
              </div>
              <Keyboard
                guide={guide}
                wrongCode={wrongCode}
                unlockedKeys={lesson.availableKeys}
                newKeys={lesson.newKeys}
                platform={keyboardPlatform}
              />
              <div className="keyboard-legend">
                <span>
                  <i className="legend-dot green" />
                  Phím cần gõ
                </span>
                <span>
                  <i className="legend-dot red" />
                  Phím gõ sai
                </span>
                <span>
                  <i className="legend-dot purple" />
                  Phím mới
                </span>
                <span>
                  <span className="legend-notch" />
                  Vị trí đặt ngón trỏ
                </span>
              </div>
            </section>
          )}
          <div className="practice-footer">
            <span>
              <Lightbulb size={15} /> Dành vài phút mỗi ngày để tạo thói quen.
            </span>
            <span>QWERTY · {keyboardPlatform === "mac" ? "Mac" : keyboardPlatform === "windows" ? "Windows" : "Linux"}</span>
          </div>
        </div>
        <aside className="practice-aside">
          <section className="panel lesson-info">
            <span className="eyebrow">VỀ BÀI TẬP NÀY</span>
            <h3>Chạm đúng từ đầu</h3>
            <p>{lesson.description}</p>
            <div className="lesson-key-chips">
              {lesson.keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </div>
            <div className="lesson-targets">
              <h4>Mục tiêu của bạn</h4>
              <div>
                <Crosshair size={16} />
                <span>Độ chính xác</span>
                <strong>≥ {lesson.targetAccuracy}%</strong>
              </div>
              {lesson.targetWpm !== null && (
                <div>
                  <Gauge size={16} />
                  <span>Tốc độ</span>
                  <strong>≥ {formatSpeed(lesson.targetWpm, preferences.speedUnit)}</strong>
                </div>
              )}
            </div>
            <div className="lesson-tip">
              <Lightbulb size={19} />
              <div>
                <strong>Mẹo nhỏ, khác biệt lớn</strong>
                <p>{lesson.tip}</p>
              </div>
            </div>
            <details className="lesson-settings">
              <summary><Settings2 size={16} /> Cài đặt bài luyện</summary>
              <div>
                <button type="button" onClick={onRestart}>
                  <RotateCcw size={15} /> Đặt lại lượt đang tập
                </button>
                <button
                  type="button"
                  className="danger-setting"
                  disabled={progressWriteBusy}
                  onClick={() => void resetProgress()}
                >
                  <RotateCcw size={15} />
                  {resetBusy ? "Đang đặt lại…" : "Xóa tiến độ bài này"}
                </button>
              </div>
            </details>
          </section>
          <section className="panel journey-card">
            <div className="section-line">
              <h3>Chặng đường tiếp theo</h3>
              <span>
                {lesson.order}/{lessons.length}
              </span>
            </div>
            <div className="journey-list">
              {nearby.map((item) => {
                const passed = attempts.some(
                  (a) => a.lessonId === item.id && a.passed,
                );
                const unlocked = isLessonUnlocked(item, lessons, attempts);
                return (
                  <button
                    className={`journey-item ${item.id === lesson.id ? "current" : ""}`}
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    disabled={!unlocked}
                    aria-current={item.id === lesson.id ? "step" : undefined}
                  >
                    <span
                      className={`journey-number ${passed ? "passed" : ""}`}
                    >
                      {passed ? (
                        <Check size={15} />
                      ) : !unlocked ? (
                        <LockKeyhole size={14} />
                      ) : (
                        String(item.order).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.id === lesson.id
                          ? "Bạn đang ở đây"
                          : passed
                            ? "Đã đạt mục tiêu"
                            : unlocked
                              ? "Sẵn sàng"
                              : "Chưa mở khóa"}
                      </small>
                    </span>
                    {item.id === lesson.id && <span className="tiny-dot" />}
                  </button>
                );
              })}
            </div>
            <button className="text-button" onClick={onOpenLessons}>
              Xem tất cả bài tập <ArrowRight size={15} />
            </button>
          </section>
          <div className="calm-note">
            <span>✦</span>
            <p>
              Không cần nhanh hơn ai.
              <br />
              <strong>Chỉ cần tốt hơn hôm qua.</strong>
            </p>
          </div>
        </aside>
      </div>
      <div className="lesson-navigation">
        <button
          className="text-button"
          disabled={lesson.order === 1}
          onClick={() => {
            const prev = lessons.find((l) => l.order === lesson.order - 1);
            if (prev) onSelect(prev.id);
          }}
        >
          <ArrowLeft size={15} /> Bài trước
        </button>
        <span>{lesson.title}</span>
        <button
          className="text-button"
          disabled={!nextLesson || !nextLessonUnlocked}
          onClick={() => {
            if (nextLesson) onSelect(nextLesson.id);
          }}
        >
          Bài tiếp theo <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
