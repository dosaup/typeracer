export class FeedbackAudio {
  private context: AudioContext | null = null;

  // Called from a user gesture. Failure is non-fatal: visual feedback still works.
  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => undefined);
    } catch {
      /* Audio is optional. */
    }
  }

  beep(): void {
    this.unlock();
    const context = this.context;
    if (!context || context.state !== "running") return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 260;
      gain.gain.setValueAtTime(0.065, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      /* Keep typing usable on browsers without audio support. */
    }
  }

  dispose(): void {
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
  }
}
