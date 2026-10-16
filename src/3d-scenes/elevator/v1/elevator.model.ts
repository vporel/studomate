import { clamp } from "@/3d-scenes/scene-math";
import type { SceneModel, ScenePointValues } from "@/3d-scenes/scene-model";

/** Height of the shaft, from the ground floor (0) to the top floor. */
export const CABIN_TRAVEL = 200;
/** Position of the cabin at each floor. */
export const FLOOR_POSITIONS = [0, 100, CABIN_TRAVEL] as const;
/** Travel of the door, from closed (0) to open. */
export const DOOR_TRAVEL = 100;
/** Speed of the cabin, in model units per ms (40 units per second). */
export const CABIN_SPEED_PER_MS = 0.04;
/** Speed of the door, in model units per ms (50 units per second). */
export const DOOR_SPEED_PER_MS = 0.05;
/**
 * The door cannot start closing before it has stayed fully open this long, even if its command
 * is released earlier.
 */
export const DOOR_HOLD_MS = 2000;
/**
 * Minimum time a button reads as pressed, in simulated ms: a click shorter than a PLC
 * cycle is still seen by the next scan.
 */
export const BUTTON_MIN_PRESS_MS = 300;

/** Operator buttons: each one is read by the PLC through the sensor point of the same id. */
export const ELEVATOR_BUTTONS = [
	"cabinButton0",
	"cabinButton1",
	"cabinButton2",
	"landingButton0",
	"landingButton1",
	"landingButton2",
] as const;
export type ElevatorButton = (typeof ELEVATOR_BUTTONS)[number];
/** Half-width of the detection window of a floor sensor around its floor. */
export const FLOOR_SENSOR_WINDOW = 3;

export interface ElevatorState {
	/** Position of the cabin along the shaft, from 0 (ground floor) to `CABIN_TRAVEL`. */
	position: number;
	/** Opening of the door, from 0 (closed) to `DOOR_TRAVEL`. */
	doorPosition: number;
	/** Time spent with the door fully open since it last left the closed position. */
	doorOpenMs: number;
	/** Set once the door has been held open long enough; released when it is closed again. */
	doorHoldElapsed: boolean;
	/** The operator holds the button down. */
	buttonsHeld: Record<ElevatorButton, boolean>;
	/** Remaining time each button still reads as pressed after a click. */
	buttonsHoldMs: Record<ElevatorButton, number>;
	/** Commands the PLC gives to the cabin and the door in the last cycle. */
	commands: { up: boolean; down: boolean; door: boolean };
	/** Value of the current floor variable; null while it is not bound or unknown. */
	currentFloor: number | null;
}

export type ElevatorInteraction =
	| { type: "pressButton"; button: ElevatorButton }
	| { type: "releaseButton"; button: ElevatorButton };

/** What the PLC reads on a button input. */
export function isButtonPressed(
	state: ElevatorState,
	button: ElevatorButton,
): boolean {
	return state.buttonsHeld[button] || state.buttonsHoldMs[button] > 0;
}

function recordOf<T>(value: T): Record<ElevatorButton, T> {
	return Object.fromEntries(
		ELEVATOR_BUTTONS.map((button) => [button, value]),
	) as Record<ElevatorButton, T>;
}

const ElevatorModel: SceneModel<ElevatorState, ElevatorInteraction> = {
	createState() {
		return {
			position: 0,
			doorPosition: 0,
			doorOpenMs: 0,
			doorHoldElapsed: false,
			buttonsHeld: recordOf(false),
			buttonsHoldMs: recordOf(0),
			commands: { up: false, down: false, door: false },
			currentFloor: null,
		};
	},

	step(state, dtMs, actuators) {
		const cabinDistance = CABIN_SPEED_PER_MS * dtMs;
		let position = state.position;
		if (actuators.up === true) position += cabinDistance;
		if (actuators.down === true) position -= cabinDistance;
		position = clamp(position, 0, CABIN_TRAVEL);

		const doorDistance = DOOR_SPEED_PER_MS * dtMs;
		let doorPosition = state.doorPosition;
		if (actuators.door === true) doorPosition += doorDistance;
		else if (state.doorHoldElapsed) doorPosition -= doorDistance;
		doorPosition = clamp(doorPosition, 0, DOOR_TRAVEL);

		const doorOpenMs =
			doorPosition >= DOOR_TRAVEL ? state.doorOpenMs + dtMs : 0;
		const doorHoldElapsed =
			doorPosition > 0 && (state.doorHoldElapsed || doorOpenMs >= DOOR_HOLD_MS);

		return {
			position,
			doorPosition,
			doorOpenMs,
			doorHoldElapsed,
			buttonsHeld: state.buttonsHeld,
			buttonsHoldMs: Object.fromEntries(
				ELEVATOR_BUTTONS.map((button) => [
					button,
					Math.max(0, state.buttonsHoldMs[button] - dtMs),
				]),
			) as Record<ElevatorButton, number>,
			commands: {
				up: actuators.up === true,
				down: actuators.down === true,
				door: actuators.door === true,
			},
			currentFloor:
				typeof actuators.currentFloor === "number"
					? actuators.currentFloor
					: null,
		};
	},

	readSensors(state): ScenePointValues {
		const atFloor = (floor: number) =>
			Math.abs(state.position - FLOOR_POSITIONS[floor]) <= FLOOR_SENSOR_WINDOW;
		return {
			floor0: atFloor(0),
			floor1: atFloor(1),
			floor2: atFloor(2),
			doorOpen: state.doorPosition >= DOOR_TRAVEL,
			cabinPosition: Math.round(state.position),
			...Object.fromEntries(
				ELEVATOR_BUTTONS.map((button) => [
					button,
					isButtonPressed(state, button),
				]),
			),
		};
	},

	applyInteraction(state, interaction) {
		const pressed = interaction.type === "pressButton";
		return {
			...state,
			buttonsHeld: { ...state.buttonsHeld, [interaction.button]: pressed },
			buttonsHoldMs: pressed
				? { ...state.buttonsHoldMs, [interaction.button]: BUTTON_MIN_PRESS_MS }
				: state.buttonsHoldMs,
		};
	},
};

export default ElevatorModel;
