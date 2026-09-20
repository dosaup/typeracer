import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleAlert,
  Flag,
  Flame,
  Keyboard,
  Layers3,
  LoaderCircle,
  Menu,
  Monitor,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { Attempt, KeyboardPlatform, Lesson, Preferences } from "./domain/types";
import { getStreak } from "./domain/typing";
import { isLessonUnlocked, nextAvailableLesson, passedLessonIds } from "./domain/progression";
import { detectKeyboardPlatform } from "./domain/keyboard";
import { useServices } from "./services/context";
import { Practice } from "./components/Practice";
import { LessonLibrary } from "./components/LessonLibrary";
import { Progress } from "./components/Progress";
import { Guide } from "./components/Guide";
import { TypingIntro } from "./components/TypingIntro";

type Page = "practice" | "lessons" | "progress" | "guide" | "intro" | "friends" | "leaderboard";
const pageNames: Record<Page, string> = {
  practice: "Luyện tập",
  lessons: "Lộ trình bài tập",
  progress: "Tiến độ của tôi",
  guide: "Góc hướng dẫn",
  intro: "Hướng dẫn đặt tay",
  friends: "Đua cùng bạn bè",
  leaderboard: "Bảng xếp hạng",
};

function readRoute(): { page: Page; lessonRef?: string } {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { page: "progress" };
  if (path === "/lessons") return { page: "lessons" };
  if (path === "/guide") return { page: "guide" };
  if (path === "/typing-intro") return { page: "intro" };
  if (path === "/friends") return { page: "friends" };
  if (path === "/leaderboard") return { page: "leaderboard" };
  if (path === "/practice") return { page: "practice" };
  if (path.startsWith("/practice/"))
    return { page: "practice", lessonRef: decodeURIComponent(path.slice(10)) };
  return { page: "progress" };
}

function pathFor(page: Page, lessonOrder?: number): string {
  if (page === "progress") return "/";
  if (page === "intro") return "/typing-intro";
  if (page === "practice")
    return lessonOrder ? `/practice/bai-${lessonOrder}` : "/practice";
  return `/${page}`;
}

function lessonFromRoute(lessons: Lesson[], lessonRef?: string): Lesson | undefined {
  if (!lessonRef) return undefined;
  const orderMatch = /^bai-(\d+)$/.exec(lessonRef);
  if (orderMatch) {
    const order = Number(orderMatch[1]);
    return lessons.find((lesson) => lesson.order === order);
  }
  // Resolve old technical-ID URLs once, then canonicalize them to /practice/bai-N.
  return lessons.find((lesson) => lesson.id === lessonRef);
}

export function App() {
  const services = useServices();
  const [page, setPage] = useState<Page>(() => readRoute().page);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    sound: true,
    showHands: true,
    speedUnit: "wpm",
    keyboardPlatform: "auto",
    introSeen: false,
  });
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<KeyboardPlatform>("windows");
  const [introReturnPage, setIntroReturnPage] = useState<"lessons" | "guide">("lessons");
  const [lessonId, setLessonId] = useState("");
  const [sessionVersion, setSessionVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const busyRef = useRef(false);
  const loadVersion = useRef(0);
  const preferencesPending = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const passed = passedLessonIds(attempts, lessons);
  const percentPassed = lessons.length
    ? (passed.size / lessons.length) * 100
    : 0;
  const isCommunityPage = page === "friends" || page === "leaderboard";
  const keyboardPlatform = preferences.keyboardPlatform === "auto"
    ? detectedPlatform
    : preferences.keyboardPlatform;

  useEffect(() => {
    let active = true;
    void detectKeyboardPlatform().then((platform) => {
      if (active) setDetectedPlatform(platform);
    });
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const [newLessons, newAttempts, newPreferences] = await Promise.all([
        services.lessons.list(),
        services.progress.listAttempts(),
        services.preferences.get(),
      ]);
      if (version !== loadVersion.current) return;
      if (!newLessons.length)
        throw new Error("Chưa có bài tập. Vui lòng thử tải lại.");
      const sortedLessons = [...newLessons].sort((a, b) => a.order - b.order);
      setLessons(sortedLessons);
      const masteredIds = new Set(
        newAttempts
          .filter((attempt) => attempt.passed)
          .map((attempt) => attempt.lessonId),
      );
      setLessonId(
        (current) => {
          if (sortedLessons.some((item) => item.id === current)) return current;
          const routed = lessonFromRoute(sortedLessons, readRoute().lessonRef);
          return (routed && isLessonUnlocked(routed, sortedLessons, newAttempts) ? routed.id : undefined) ||
            nextAvailableLesson(sortedLessons, newAttempts)?.id ||
            sortedLessons.find((item) => !masteredIds.has(item.id))?.id ||
            sortedLessons[0].id;
        },
      );
      setAttempts(newAttempts);
      setPreferences(newPreferences);
      setReady(true);
      setError("");
    } catch (cause) {
      if (version === loadVersion.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể đọc dữ liệu. Hãy thử lại.",
        );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    void refresh();
    const unsubscribe = services.subscribe?.(() => {
      void refresh();
    });
    return () => {
      loadVersion.current++;
      unsubscribe?.();
    };
  }, [refresh, services]);

  const onBusyChange = useCallback((busy: boolean) => {
    busyRef.current = busy;
  }, []);
  function canLeave(): boolean {
    return (
      !busyRef.current ||
      window.confirm(
        "Kết quả hiện tại chưa được lưu. Rời bài sẽ mất phần đang luyện hoặc kết quả chưa lưu. Bạn muốn tiếp tục?",
      )
    );
  }
  function navigate(next: Page) {
    const nextPath = pathFor(next, next === "practice" ? lesson?.order : undefined);
    if (next === page && window.location.pathname === nextPath) {
      setSidebarOpen(false);
      return;
    }
    if (!canLeave()) return;
    window.history.pushState(null, "", nextPath);
    setPage(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function selectLesson(id: string) {
    const selectedLesson = lessons.find((item) => item.id === id);
    if (!selectedLesson || !isLessonUnlocked(selectedLesson, lessons, attempts)) {
      setError("Hãy đạt mục tiêu của bài trước để mở khóa bài này.");
      return;
    }
    setError("");
    const nextPath = pathFor("practice", selectedLesson?.order);
    if (page === "practice" && id === lesson.id && window.location.pathname === nextPath) return;
    if (!canLeave()) return;
    window.history.pushState(null, "", nextPath);
    setLessonId(selectedLesson.id);
    setSessionVersion((version) => version + 1);
    setPage("practice");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function restart() {
    if (!canLeave()) return;
    setSessionVersion((version) => version + 1);
  }

  function openIntro(from: "lessons" | "guide") {
    setIntroReturnPage(from);
    navigate("intro");
  }

  const saveAttempt = useCallback(
    async (attempt: Attempt) => {
      await services.progress.saveAttempt(attempt);
      setAttempts((current) =>
        [...current.filter((a) => a.id !== attempt.id), attempt].sort((a, b) =>
          b.completedAt.localeCompare(a.completedAt),
        ),
      );
    },
    [services],
  );

  const resetLessonProgress = useCallback(
    async (id: string) => {
      try {
        await services.progress.resetLesson(id);
        setAttempts((current) => current.filter((attempt) => attempt.lessonId !== id));
        setSessionVersion((version) => version + 1);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể đặt lại tiến độ bài này.",
        );
        throw cause;
      }
    },
    [services],
  );

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      if (preferencesPending.current) return;
      preferencesPending.current = true;
      setPreferencesBusy(true);
      try {
        setPreferences(await services.preferences.update(patch));
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Không lưu được tùy chọn.",
        );
      } finally {
        preferencesPending.current = false;
        setPreferencesBusy(false);
      }
    },
    [services],
  );

  useEffect(() => {
    document.title = `${pageNames[page]} · Keylane`;
  }, [page]);
  useEffect(() => {
    const handlePopState = () => {
      const next = readRoute();
      if (!canLeave()) {
        window.history.pushState(null, "", pathFor(page, lesson?.order));
        return;
      }
      setPage(next.page);
      const routedLesson = lessonFromRoute(lessons, next.lessonRef);
      if (routedLesson) {
        const allowedLesson = isLessonUnlocked(routedLesson, lessons, attempts)
          ? routedLesson
          : nextAvailableLesson(lessons, attempts);
        if (allowedLesson) setLessonId(allowedLesson.id);
      }
      setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [attempts, lesson, lessons, page]);
  useEffect(() => {
    if (!ready || page !== "practice" || !lesson) return;
    const canonicalPath = pathFor("practice", lesson.order);
    if (window.location.pathname !== canonicalPath)
      window.history.replaceState(null, "", canonicalPath);
  }, [lesson, page, ready]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(sidebarRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? []),
      ].filter((element) => getComputedStyle(element).display !== "none");
    focusable()[0]?.focus();
    const handleNavigation = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleNavigation);
    return () => {
      document.removeEventListener("keydown", handleNavigation);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
        role={sidebarOpen ? "dialog" : undefined}
        aria-modal={sidebarOpen || undefined}
        aria-label="Menu điều hướng"
      >
        <button
          className="brand"
          onClick={() => navigate("progress")}
          aria-label="Keylane — về trang tiến độ"
        >
          <span className="brand-mark">
            <span>k</span>
            <i />
          </span>
          <span>
            keylane<span className="brand-dot">.</span>
          </span>
        </button>
        <button
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">CÁ NHÂN</div>
        <nav className="primary-nav" aria-label="Điều hướng chính">
          {(
            [
              { id: "practice", icon: Keyboard },
              { id: "lessons", icon: Layers3 },
              { id: "progress", icon: BarChart3 },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-active" : ""}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{pageNames[id]}</span>
              {page === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="workspace-label community-label">CỘNG ĐỒNG</div>
        <div className="primary-nav future-nav">
          <button
            className={page === "friends" ? "nav-active" : ""}
            onClick={() => navigate("friends")}
            aria-current={page === "friends" ? "page" : undefined}
          >
            <Users size={19} />
            <span>Đua cùng bạn bè</span>
            <small>Sắp có</small>
          </button>
          <button
            className={page === "leaderboard" ? "nav-active" : ""}
            onClick={() => navigate("leaderboard")}
            aria-current={page === "leaderboard" ? "page" : undefined}
          >
            <Trophy size={19} />
            <span>Bảng xếp hạng</span>
            <small>Sắp có</small>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <span className="progress-spark">
              <Sparkles size={18} />
            </span>
            <h3>Từng chút một, mỗi ngày</h3>
            <p>
              {passed.size}/{lessons.length || 12} bài đã đạt mục tiêu
            </p>
            <div className="mini-progress">
              <span style={{ width: `${percentPassed}%` }} />
            </div>
            <button onClick={() => navigate("lessons")}>
              Xem lộ trình <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`help-link ${page === "guide" ? "selected" : ""}`}
            onClick={() => navigate("guide")}
          >
            <BookOpen size={18} /> Góc hướng dẫn <ChevronRight size={15} />
          </button>
          <div className="local-profile">
            <div className="avatar">K</div>
            <div>
              <strong>Người học tự do</strong>
              <span>Không cần tài khoản</span>
            </div>
            <ShieldCheck size={18} />
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={sidebarOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Mở menu điều hướng"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>{isCommunityPage ? "Cộng đồng" : "Cá nhân"}</span>
            <ChevronRight size={14} />
            <strong>{pageNames[page]}</strong>
            {page === "practice" && lesson && (
              <>
                <ChevronRight size={14} />
                <strong className="breadcrumb-lesson">
                  Bài {lesson.order} - {lesson.title}
                </strong>
              </>
            )}
          </div>
          <div className="topbar-meta">
            <label className="keyboard-platform-select">
              <span className="sr-only">Layout bàn phím</span>
              <Keyboard size={14} />
              <select
                value={preferences.keyboardPlatform}
                disabled={preferencesBusy}
                aria-label={`Kiểu bàn phím. Đang dùng ${keyboardPlatform}`}
                onChange={(event) => void updatePreferences({
                  keyboardPlatform: event.target.value as Preferences["keyboardPlatform"],
                })}
              >
                <option value="auto">Tự động ({detectedPlatform === "mac" ? "Mac" : detectedPlatform === "windows" ? "Windows" : "Linux"})</option>
                <option value="mac">Mac</option>
                <option value="windows">Windows</option>
                <option value="linux">Linux</option>
              </select>
            </label>
            <div className="speed-unit-toggle" role="group" aria-label="Đơn vị tốc độ">
              {(["wpm", "cpm"] as const).map((unit) => (
                <button
                  type="button"
                  key={unit}
                  className={preferences.speedUnit === unit ? "active" : ""}
                  aria-pressed={preferences.speedUnit === unit}
                  disabled={preferencesBusy}
                  onClick={() => void updatePreferences({ speedUnit: unit })}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="local-badge">
              <Monitor size={14} /> Lưu trên thiết bị
            </span>
            <span className="topbar-divider" />
            <span className="topbar-streak">
              <Flame size={16} />
              {getStreak(attempts)}
              <span> ngày liên tiếp</span>
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && (
            <div className="app-error" role="alert">
              <CircleAlert size={19} />
              <span>{error}</span>
              <button
                onClick={() => {
                  setLoading(true);
                  void refresh();
                }}
                disabled={loading}
              >
                Thử lại
              </button>
            </div>
          )}
          {!ready ? (
            <div className="loading-state">
              {loading ? (
                <>
                  <LoaderCircle size={28} className="spin" />
                  <p>Đang chuẩn bị đường đua…</p>
                </>
              ) : (
                <>
                  <ShieldCheck size={32} />
                  <h1>Chưa đọc được dữ liệu</h1>
                  <p>
                    Kiểm tra quyền lưu dữ liệu của trình duyệt rồi nhấn thử lại.
                    Dữ liệu hiện có được giữ nguyên.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {page === "practice" && (
                <Practice
                  key={`${lesson.id}-${sessionVersion}`}
                  lesson={lesson}
                  lessons={lessons}
                  attempts={attempts}
                  preferences={preferences}
                  keyboardPlatform={keyboardPlatform}
                  preferencesBusy={preferencesBusy}
                  onPreferences={(patch) => {
                    void updatePreferences(patch);
                  }}
                  onSave={saveAttempt}
                  onResetProgress={resetLessonProgress}
                  onSelect={selectLesson}
                  onRestart={restart}
                  onBusyChange={onBusyChange}
                  onOpenLessons={() => navigate("lessons")}
                />
              )}
              {page === "lessons" && (
                <LessonLibrary
                  lessons={lessons}
                  attempts={attempts}
                  speedUnit={preferences.speedUnit}
                  onSelect={selectLesson}
                  onOpenIntro={() => openIntro("lessons")}
                />
              )}
              {page === "progress" && (
                <Progress
                  lessons={lessons}
                  attempts={attempts}
                  speedUnit={preferences.speedUnit}
                  onSelect={selectLesson}
                  onPractice={() => selectLesson(lessons[0].id)}
                />
              )}
              {page === "guide" && (
                <Guide
                  onPractice={() => navigate("practice")}
                  onOpenIntro={() => openIntro("guide")}
                />
              )}
              {page === "intro" && (
                <TypingIntro
                  keyboardPlatform={keyboardPlatform}
                  onExit={() => navigate(introReturnPage)}
                  onBegin={() => {
                    void updatePreferences({ introSeen: true });
                    selectLesson(lessons[0].id);
                  }}
                />
              )}
              {(page === "friends" || page === "leaderboard") && (
                <section className="panel coming-soon">
                  <span className="coming-soon-icon">
                    {page === "friends" ? <Users size={30} /> : <Trophy size={30} />}
                  </span>
                  <h1>{pageNames[page]}</h1>
                  <p>Tính năng này đang được hoàn thiện và sẽ sớm ra mắt.</p>
                  <button className="button button-primary" onClick={() => navigate("progress")}>
                    Về trang tiến độ
                  </button>
                </section>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Flag size={13} /> Keylane · Tìm nhịp gõ của riêng bạn.
          </span>
          <span>
            <ShieldCheck size={13} /> Riêng tư. Không tài khoản. Không áp lực.
          </span>
        </footer>
      </div>
    </div>
  );
}
