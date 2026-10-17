import type { ScenePointValue } from "./scene.descriptor";

export type ScenePointValues = Record<string, ScenePointValue>;

/**
 * Pure physical model of a scene. `State` is serializable (`structuredClone`) since it is what
 * the 3D tab receives. Every method returns a new state and never mutates its input.
 */
export interface SceneModel<State, Interaction> {
	createState(): State;
	/** Advances the state by one elementary step of `dtMs`. */
	step(state: State, dtMs: number, actuators: ScenePointValues): State;
	readSensors(state: State): ScenePointValues;
	applyInteraction(state: State, interaction: Interaction): State;
}
