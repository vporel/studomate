export type TimedState<T> = { simTimeMs: number; state: T };

/**
 * Renders states received at the PLC cycle rate on a continuous timeline: the view lags one
 * cycle behind and blends the two latest states according to the wall-clock time elapsed since
 * the latest one arrived. A state older than the latest one (reset, new simulation) restarts
 * the timeline without blending.
 */
export default class StateInterpolator<T> {
	private previous: TimedState<T> | null = null;
	private latest: TimedState<T> | null = null;
	private latestReceivedAtMs = 0;

	constructor(private readonly lerp: (from: T, to: T, ratio: number) => T) {}

	push(sample: TimedState<T>, receivedAtMs: number): void {
		const restarted =
			this.latest !== null && sample.simTimeMs < this.latest.simTimeMs;
		this.previous = restarted ? null : this.latest;
		this.latest = sample;
		this.latestReceivedAtMs = receivedAtMs;
	}

	sample(nowMs: number): T | null {
		if (!this.latest) return null;
		if (!this.previous) return this.latest.state;
		const span = this.latest.simTimeMs - this.previous.simTimeMs;
		if (span <= 0) return this.latest.state;
		const ratio = Math.min(
			1,
			Math.max(0, (nowMs - this.latestReceivedAtMs) / span),
		);
		return this.lerp(this.previous.state, this.latest.state, ratio);
	}
}
