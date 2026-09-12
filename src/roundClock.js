/** A monotonic round clock whose deadlines exclude every paused interval. */
export class RoundClock {
  constructor(now = () => performance.now()) {
    this.sourceNow = now;
    this.reset();
  }

  /** Start a fresh clock; callers own stage and target deadlines. */
  reset() {
    this.elapsed = 0;
    this.startedAt = this.sourceNow();
    this.paused = false;
  }

  /** Return active milliseconds, unchanged while paused. */
  now() {
    return this.elapsed + (this.paused ? 0 : Math.max(0, this.sourceNow() - this.startedAt));
  }

  /** Freeze once, so repeated lifecycle notifications cannot consume time. */
  pause() {
    if (!this.paused) {
      this.elapsed = this.now();
      this.paused = true;
    }
  }

  /** Resume from exactly the preserved active time. */
  resume() {
    if (this.paused) {
      this.startedAt = this.sourceNow();
      this.paused = false;
    }
  }
}
