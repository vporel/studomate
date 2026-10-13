import type { SceneModel, ScenePointValues } from "./scene-model";

export const DEFAULT_SUB_STEP_MS = 10;

/**
 * Runs a model by fixed sub-steps whatever the PLC cycle time is. The remainder of a cycle that
 * does not fill a sub-step is carried over to the next cycle.
 *
 * A boolean sensor that differs from its value at the start of the cycle during at least one
 * sub-step is reported with that value for the whole cycle, so that a fast pulse is not missed.
 * A numeric sensor takes the value of the last sub-step.
 */
export default class SceneStepper<State, Interaction> {
	private state: State;
	private remainderMs = 0;
	private simTimeMs = 0;

	constructor(
		private readonly model: SceneModel<State, Interaction>,
		private readonly subStepMs: number = DEFAULT_SUB_STEP_MS,
	) {
		this.state = model.createState();
	}

	getState(): State {
		return this.state;
	}

	/** Simulated time covered by the executed sub-steps. */
	getSimTimeMs(): number {
		return this.simTimeMs;
	}

	readSensors(): ScenePointValues {
		return this.model.readSensors(this.state);
	}

	reset(): void {
		this.state = this.model.createState();
		this.remainderMs = 0;
		this.simTimeMs = 0;
	}

	applyInteraction(interaction: Interaction): void {
		this.state = this.model.applyInteraction(this.state, interaction);
	}

	/** Advances by `dtMs` with constant actuators and returns the sensors seen by the cycle. */
	advance(dtMs: number, actuators: ScenePointValues): ScenePointValues {
		const startSensors = this.model.readSensors(this.state);
		const total = this.remainderMs + dtMs;
		const subSteps = Math.floor(total / this.subStepMs + 1e-9);
		this.remainderMs = total - subSteps * this.subStepMs;

		const pulsed = new Set<string>();
		for (let i = 0; i < subSteps; i++) {
			this.state = this.model.step(this.state, this.subStepMs, actuators);
			this.simTimeMs += this.subStepMs;
			const sensors = this.model.readSensors(this.state);
			for (const [id, value] of Object.entries(sensors)) {
				if (typeof value === "boolean" && value !== startSensors[id]) {
					pulsed.add(id);
				}
			}
		}

		const endSensors = this.model.readSensors(this.state);
		const seen: ScenePointValues = { ...endSensors };
		for (const id of pulsed) seen[id] = !startSensors[id];
		return seen;
	}
}
