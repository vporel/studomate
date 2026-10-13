import type { SceneModel, ScenePointValues } from "../scene-model";

/** Travel of the drill, from the top limit (0) to the bottom limit. */
export const DRILL_TRAVEL = 100;
/** Speed of the drill, in model units per ms (40 units per second). */
export const DRILL_SPEED_PER_MS = 0.04;
/** Rotation speed of the spindle, in radians per ms. */
export const SPINDLE_SPEED_PER_MS = 0.02;
/** Time the spindle must turn with the drill at the bottom to complete the hole. */
export const DRILLING_DURATION_MS = 1500;

export interface DrillingState {
	/** Position of the drill, from 0 (top) to `DRILL_TRAVEL` (bottom). */
	position: number;
	/** Rotation of the spindle, in radians. */
	spindleAngle: number;
	/** Progress of the hole in the workpiece, from 0 (none) to 1 (through). */
	holeProgress: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

const DrillingModel: SceneModel<DrillingState, never> = {
	createState() {
		return { position: 0, spindleAngle: 0, holeProgress: 0 };
	},

	step(state, dtMs, actuators) {
		const distance = DRILL_SPEED_PER_MS * dtMs;
		let position = state.position;
		if (actuators.down === true) position += distance;
		if (actuators.up === true) position -= distance;
		position = clamp(position, 0, DRILL_TRAVEL);

		const spinning = actuators.spindle === true;
		const spindleAngle = spinning
			? state.spindleAngle + SPINDLE_SPEED_PER_MS * dtMs
			: state.spindleAngle;
		const holeProgress =
			spinning && position >= DRILL_TRAVEL
				? Math.min(1, state.holeProgress + dtMs / DRILLING_DURATION_MS)
				: state.holeProgress;

		return { position, spindleAngle, holeProgress };
	},

	readSensors(state): ScenePointValues {
		return {
			high: state.position <= 0,
			low: state.position >= DRILL_TRAVEL,
			drillPosition: Math.round(state.position),
		};
	},

	applyInteraction(state) {
		return state;
	},
};

export default DrillingModel;
