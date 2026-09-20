import { useCallback, useEffect, useRef, useState } from "react";
import type { Attempt, Lesson } from "../domain/types";
import { acceptKey, initialTypingState, makeAttempt } from "../domain/typing";
import { FeedbackAudio } from "../services/audio";

export type SessionStatus = "ready" | "countdown" | "running" | "paused" | "complete";
type PauseReason = "manual" | "focus";

export function useTypingSession(lesson: Lesson, sound: boolean, maxDurationMs: number) {
  const [state, setState] = useState(initialTypingState);
  const [status, setStatus] = useState<SessionStatus>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const countdownDeadline = useRef(0);
  const hasStarted = useRef(false);
  const recentKeys = useRef<{ at: number; delta: number }[]>([]);
  const [wrongCode, setWrongCode] = useState<string | null>(null);
  const [result, setResult] = useState<Attempt | null>(null);
  const [endReason, setEndReason] = useState<"finished" | "timeout" | null>(null);
  const stateRef = useRef(state);
  const statusRef = useRef<SessionStatus>("ready");
  const pauseReason = useRef<PauseReason | null>(null);
  const [resumeOnTyping, setResumeOnTyping] = useState(false);
  const clock = useRef({ accumulated: 0, startedAt: null as number | null });
  const audio = useRef(new FeedbackAudio());
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentElapsed = useCallback(
    () =>
      clock.current.accumulated +
      (clock.current.startedAt === null
        ? 0
        : performance.now() - clock.current.startedAt),
    [],
  );

  const pause = useCallback(
    (reason: PauseReason = "manual") => {
      // An explicit pause overrides a previous automatic pause.
      if (statusRef.current === "paused" && reason === "manual") {
        pauseReason.current = "manual";
        setResumeOnTyping(false);
        return;
      }
      if (statusRef.current !== "running" && statusRef.current !== "countdown") return;
      setCountdown(null);
      clock.current.accumulated = currentElapsed();
      clock.current.startedAt = null;
      statusRef.current = "paused";
      pauseReason.current = reason;
      setResumeOnTyping(reason === "focus");
      setElapsed(clock.current.accumulated);
      setStatus("paused");
    },
    [currentElapsed],
  );

  const start = useCallback(() => {
    if (statusRef.current === "complete" || statusRef.current === "running" || statusRef.current === "countdown")
      return;
    if (sound) audio.current.unlock();
    pauseReason.current = null;
    setResumeOnTyping(false);
    if (!hasStarted.current) {
      countdownDeadline.current = performance.now() + 5000;
      statusRef.current = "countdown";
      setCountdown(5);
      setStatus("countdown");
      return;
    }
    clock.current.startedAt = performance.now();
    statusRef.current = "running";
    setStatus("running");
  }, [sound]);

  const finishOnTimeout = useCallback(() => {
    if (statusRef.current === "complete") return;
    clock.current = { accumulated: maxDurationMs, startedAt: null };
    statusRef.current = "complete";
    setElapsed(maxDurationMs);
    setStatus("complete");
    setEndReason("timeout");
    setResult({
      ...makeAttempt(lesson, stateRef.current, maxDurationMs, crypto.randomUUID()),
      passed: false,
    });
  }, [lesson, maxDurationMs]);

  const input = useCallback(
    (key: string, code: string) => {
      if (statusRef.current === "complete" || statusRef.current === "countdown") return;
      if (statusRef.current === "paused") {
        // Input reaches this hook only from the typing field. A real character
        // resumes focus-related pauses, never an explicit Esc / Pause action.
        if (pauseReason.current !== "focus" || key.length !== 1) return;
        start();
        if (!hasStarted.current) return;
      }
      if (statusRef.current === "ready") {
        if (key === "Backspace") return;
        start();
        return;
      }
      if (currentElapsed() >= maxDurationMs) {
        finishOnTimeout();
        return;
      }
      const previous = stateRef.current;
      const next = acceptKey(previous, key, lesson.text);
      if (next === previous) return;
      recentKeys.current.push({ at: currentElapsed(), delta: next.position - previous.position });
      const incorrect = next.mistakes.length > previous.mistakes.length;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      if (incorrect) {
        setWrongCode(code || "Unknown");
        flashTimeout.current = setTimeout(() => setWrongCode(null), 240);
        if (sound) audio.current.beep();
      } else setWrongCode(null);
      stateRef.current = next;
      setState(next);
      if (next.position === lesson.text.length) {
        const duration = Math.max(1, currentElapsed());
        clock.current = { accumulated: duration, startedAt: null };
        statusRef.current = "complete";
        setElapsed(duration);
        setStatus("complete");
        setEndReason("finished");
        setResult(makeAttempt(lesson, next, duration, crypto.randomUUID()));
      }
    },
    [currentElapsed, finishOnTimeout, lesson, maxDurationMs, sound, start],
  );

  useEffect(() => {
    if (status !== "countdown") return;
    const interval = setInterval(() => {
      if (statusRef.current !== "countdown") return;
      const remaining = Math.max(0, Math.ceil((countdownDeadline.current - performance.now()) / 1000));
      setCountdown(remaining || null);
      if (remaining === 0) {
        hasStarted.current = true;
        clock.current.startedAt = performance.now();
        statusRef.current = "running";
        setStatus("running");
      }
    }, 50);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      if (statusRef.current !== "running") return;
      const now = currentElapsed();
      const cappedNow = Math.min(now, maxDurationMs);
      setElapsed(cappedNow);
      recentKeys.current = recentKeys.current.filter(sample => sample.at > now - 5000);
      const characters = Math.max(0, recentKeys.current.reduce((sum, sample) => sum + sample.delta, 0));
      setCurrentWpm(now < 1000 ? 0 : characters / 5 / (Math.min(now, 5000) / 60_000));
      if (now >= maxDurationMs) finishOnTimeout();
    }, 100);
    return () => clearInterval(interval);
  }, [currentElapsed, finishOnTimeout, maxDurationMs, status]);

  useEffect(() => {
    const blur = () => pause("focus");
    const visibility = () => {
      if (document.hidden) pause("focus");
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pause]);

  useEffect(
    () => () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      audio.current.dispose();
    },
    [],
  );

  return {
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
  };
}
