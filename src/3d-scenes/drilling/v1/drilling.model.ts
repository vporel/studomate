import { clamp } from "@/3d-scenes/scene-math";
import type { SceneModel, ScenePointValues } from "@/3d-scenes/scene-model";

/** Travel of the drill, from the top limit (0) to the bottom limit. */
export const DRILL_TRAVEL = 100;
/** Speed of the drill, in model units per ms (40 units per second). */
export const DRILL_SPEED_PER_MS = 0.04;
/** Rotation speed of the spindle, in radians per ms. */
export const SPINDLE_SPEED_PER_MS = 0.02;
/** Time the spindle must turn with the drill at the bottom to complete the hole. */
export const DRILLING_DURATION_MS = 1500;

/**
 * Minimum time the start button reads as pressed, in simulated ms: a click shorter than a PLC
 * cycle is still seen by the next scan.
 */
export const START_MIN_PRESS_MS = 300;

export interface DrillingState {
	/** Position of the drill, from 0 (top) to `DRILL_TRAVEL` (bottom). */
	position: number;
	/** Rotation of the spindle, in radians. */
	spindleAngle: number;
	/** Progress of the hole in the workpiece, from 0 (none) to 1 (through). */
	holeProgress: number;
	/** The operator holds the start button down. */
	startHeld: boolean;
	/** Remaining time the start button still reads as pressed after a click. */
	startHoldMs: number;
	/** Commands the PLC gives to the drill and the spindle in the last cycle. */
	commands: { down: boolean; up: boolean; spindle: boolean };
}

export type DrillingInteraction =
	{ type: "pressStart" } | { type: "releaseStart" };

/** What the PLC reads on the start button input. */
export function isStartPressed(state: DrillingState): boolean {
	return state.startHeld || state.startHoldMs > 0;
}

const DrillingModel: SceneModel<DrillingState, DrillingInteraction> = {
	createState() {
		return {
			position: 0,
			spindleAngle: 0,
			holeProgress: 0,
			startHeld: false,
			startHoldMs: 0,
			commands: { down: false, up: false, spindle: false },
		};
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

		return {
			position,
			spindleAngle,
			holeProgress,
			startHeld: state.startHeld,
			startHoldMs: Math.max(0, state.startHoldMs - dtMs),
			commands: {
				down: actuators.down === true,
				up: actuators.up === true,
				spindle: spinning,
			},
		};
	},

	readSensors(state): ScenePointValues {
		return {
			high: state.position <= 0,
			low: state.position >= DRILL_TRAVEL,
			drillPosition: Math.round(state.position),
			startButton: isStartPressed(state),
		};
	},

	applyInteraction(state, interaction) {
		if (interaction.type === "pressStart") {
			return { ...state, startHeld: true, startHoldMs: START_MIN_PRESS_MS };
		}
		return { ...state, startHeld: false };
	},
};

export default DrillingModel;
