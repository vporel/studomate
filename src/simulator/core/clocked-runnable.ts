import Runnable, { RunnableCallback } from "./runnable";

export default abstract class ClockedRunnable extends Runnable {
	private clockTimer: NodeJS.Timeout | null = null;
	private paused = false;
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

	/**
	 * Exécute exactement un cycle sans démarrer la boucle automatique.
	 * Sans effet si le runnable n'est pas en pause.
	 */
	protected tickOnce(): void {
		if (this.paused) {
			this.tick();
		}
	}

	public start(): void {
		if (!this.clockTimer && !this.paused) {
			this.executeCallback(this.onStart, "Error in onStart callback:");
			this.clockTimer = setInterval(() => this.tick(), this.clockIntervalMs);
		}
	}

	public stop(): void {
		this.paused = false;
		if (this.clockTimer) {
			clearInterval(this.clockTimer);
			this.clockTimer = null;
			this.executeCallback(this.onStop, "Error in onStop callback:");
		}
	}

	/**
	 * Fige la boucle sans déclencher `onStop`.
	 * Sans effet si le runnable n'est pas en cours d'exécution.
	 */
	public pause(): void {
		if (this.clockTimer && !this.paused) {
			clearInterval(this.clockTimer);
			this.clockTimer = null;
			this.paused = true;
		}
	}

	public resume(): void {
		if (this.paused) {
			this.paused = false;
			this.clockTimer = setInterval(() => this.tick(), this.clockIntervalMs);
		}
	}

	public isPaused(): boolean {
		return this.paused;
	}

	public isRunning(): boolean {
		return this.clockTimer !== null;
	}
}
