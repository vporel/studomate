import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";
import Runnable, { RunnableCallback } from "./runnable";

const intervalHeartbeat: HeartbeatScheduler = (tick, intervalMs) => {
	const timer = setInterval(tick, intervalMs);
	return () => clearInterval(timer);
};

export default abstract class ClockedRunnable extends Runnable {
	private stopClock: (() => void) | null = null;
	private paused = false;
	/**
	 * Horloge libre : incrémentée à **chaque** battement de l'horloge (`heartbeat`), y compris en pause.
	 * `consumedLoops` mémorise sa valeur au dernier cycle réellement exécuté ; l'écart
	 * `loops - consumedLoops` (× `clockIntervalMs`) est le temps écoulé à imputer au prochain
	 * cycle. Conséquence voulue : en pas-à-pas, le temps réel entre deux « Avancer d'un cycle »
	 * est bien pris en compte (les temporisations suivent leur cours). En mode continu, `resume`
	 * resynchronise `consumedLoops` pour que la durée de pause ne soit **pas** imputée.
	 */
	private loops = 0;
	private consumedLoops = 0;
	protected clockIntervalMs: number;
	protected onStart: RunnableCallback<this> = () => {};
	protected onStop: RunnableCallback<this> = () => {};

	private readonly heartbeat: HeartbeatScheduler;

	constructor(
		clockIntervalMs: number,
		heartbeat: HeartbeatScheduler = intervalHeartbeat,
	) {
		super();
		this.clockIntervalMs = clockIntervalMs;
		this.heartbeat = heartbeat;
	}

	getClockIntervalMs(): number {
		return this.clockIntervalMs;
	}

	protected abstract tick(): void;

	/**
	 * Temps écoulé (ms) depuis le dernier cycle exécuté, d'après l'horloge libre. À appeler
	 * **une seule fois par cycle** : l'appel avance le repère `consumedLoops`.
	 */
	protected consumeElapsedMs(): number {
		const elapsed = (this.loops - this.consumedLoops) * this.clockIntervalMs;
		this.consumedLoops = this.loops;
		return elapsed;
	}

	private onClockBeat(): void {
		this.loops++;
		if (!this.paused) this.tick();
	}

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
		if (!this.stopClock && !this.paused) {
			this.loops = 0;
			this.consumedLoops = 0;
			this.executeCallback(this.onStart, "Error in onStart callback:");
			this.stopClock = this.heartbeat(
				() => this.onClockBeat(),
				this.clockIntervalMs,
			);
		}
	}

	public stop(): void {
		this.paused = false;
		this.loops = 0;
		this.consumedLoops = 0;
		if (this.stopClock) {
			this.stopClock();
			this.stopClock = null;
			this.executeCallback(this.onStop, "Error in onStop callback:");
		}
	}

	/**
	 * Fige l'exécution sans arrêter l'horloge : les battements continuent d'être comptés, seuls
	 * les cycles cessent. Sans effet si le runnable n'est pas en cours d'exécution.
	 */
	public pause(): void {
		if (this.stopClock && !this.paused) {
			this.paused = true;
		}
	}

	/**
	 * Reprend l'exécution. Resynchronise l'horloge : le temps passé en pause n'est pas imputé
	 * au premier cycle qui suit (les temporisations reprennent là où elles s'étaient figées).
	 */
	public resume(): void {
		if (this.paused) {
			this.consumedLoops = this.loops;
			this.paused = false;
		}
	}

	public isPaused(): boolean {
		return this.paused;
	}

	public isRunning(): boolean {
		return this.stopClock !== null && !this.paused;
	}
}
