import Runnable, { RunnableCallback } from "./runnable";

export default abstract class ClockedRunnable extends Runnable {
	private clockTimer: NodeJS.Timeout | null = null;
	protected clockIntervalMs: number;
	protected onStart: RunnableCallback<this> = () => {};
	protected onStop: RunnableCallback<this> = () => {};

	constructor(clockIntervalMs: number) {
		super();
		this.clockIntervalMs = clockIntervalMs;
	}

	getClockIntervalMs(): number {
		return this.clockIntervalMs;
	}

	protected abstract tick(): void;

	public start(): void {
		if (!this.clockTimer) {
			this.executeCallback(this.onStart, "Error in onStart callback:");
			this.clockTimer = setInterval(() => this.tick(), this.clockIntervalMs);
		}
	}

	public stop(): void {
		if (this.clockTimer) {
			clearInterval(this.clockTimer);
			this.clockTimer = null;
			this.executeCallback(this.onStop, "Error in onStop callback:");
		}
	}

	public isRunning(): boolean {
		return this.clockTimer !== null;
	}
}
