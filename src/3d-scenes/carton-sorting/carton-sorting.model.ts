import type { SceneModel, ScenePointValues } from "../scene-model";

/** Distance travelled on T1 up to the detection station. */
export const T1_LENGTH = 516;
/** Level of P2 along the channel: where a low carton is stopped by T2/T3. */
export const CARTON_Y_P2 = 192;
/** Level of P3 along the channel: where a high carton is stopped by T2/T3. */
export const CARTON_Y_P3 = 276;
/** Stroke of P1: it pushes the carton just off T1 onto the channel. */
export const P1_STROKE = 60;
/** Stroke of P2 and P3: they push the carton just off the channel onto its output. */
export const OUTPUT_STROKE = 70;
export const CYLINDER_STROKES = {
	p1: P1_STROKE,
	p2: OUTPUT_STROKE,
	p3: OUTPUT_STROKE,
} as const;
/** Speed of every moving part, in model units per ms (60 units per second). */
export const SPEED_PER_MS = 0.06;
/** Half-width of the detection window of the carton sensors along the channel. */
const SENSOR_WINDOW = 8;

/** A carton already sorted: it rests on its output, `x` further along it. */
export interface SortedCarton {
	/** Level of the output it was ejected to (`CARTON_Y_P2` or `CARTON_Y_P3`). */
	y: number;
	x: number;
	tall: boolean;
}

/** Number of cartons an output holds, the one just ejected included. */
const OUTPUT_CAPACITY = 2;

export interface CartonSortingState {
	/** True once a carton was generated: it stays in the plant after leaving the station. */
	cartonExists: boolean;
	cartonPresent: boolean;
	/** Height of the carton in the plant, fixed when it was generated. */
	cartonTall: boolean;
	/** Position of the carton along T1. */
	cartonPos: number;
	/** Position of the carton along the channel. */
	cartonY: number;
	/** Lateral ejection offset. */
	cartonXExtra: number;
	cylinders: { p1: number; p2: number; p3: number };
	/** Height selected for the next carton, like the operator's switch. */
	cartonHigh: boolean;
	sortedCartons: SortedCarton[];
	/** Conveyor T1 is driven. */
	t1Running: boolean;
	/** Conveyors T2/T3 are driven. */
	t2t3Running: boolean;
}

export type CartonSortingInteraction =
	{ type: "newCarton" } | { type: "setCartonHigh"; high: boolean };

type CylinderKey = keyof CartonSortingState["cylinders"];

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function moveCylinder(
	position: number,
	out: boolean,
	back: boolean,
	distance: number,
	stroke: number,
): number {
	let next = position;
	if (out) next += distance;
	if (back) next -= distance;
	return clamp(next, 0, stroke);
}

/**
 * A new carton can be placed once the station is at rest: no carton in transit (the previous
 * one is ejected) and every cylinder retracted.
 */
export function canPlaceCarton(state: CartonSortingState): boolean {
	const inTransit = state.cartonExists && state.cartonXExtra < OUTPUT_STROKE;
	const cylindersRetracted = Object.values(state.cylinders).every(
		(position) => position <= 0,
	);
	return !inTransit && cylindersRetracted;
}

/** The ejected carton, already at rest on its output, joins the sorted ones. */
function archiveEjectedCarton(state: CartonSortingState): SortedCarton[] {
	if (!state.cartonExists) return state.sortedCartons;
	return [
		...state.sortedCartons,
		{ y: state.cartonY, x: state.cartonXExtra, tall: state.cartonTall },
	];
}

/**
 * The carton being ejected, at `pusherX` along the output at level `y`, shoves the sorted
 * cartons ahead of it, each one pushing the next. Once the ejection is complete, the cartons
 * beyond the capacity of the output are gone.
 */
function pushSortedCartons(
	cartons: SortedCarton[],
	y: number,
	pusherX: number,
): SortedCarton[] {
	let minX = pusherX + OUTPUT_STROKE;
	const pushed = [...cartons].reverse().map((carton) => {
		if (carton.y !== y) return carton;
		const x = Math.max(carton.x, minX);
		minX = x + OUTPUT_STROKE;
		return x === carton.x ? carton : { ...carton, x };
	});
	pushed.reverse();
	if (pusherX < OUTPUT_STROKE) return pushed;
	return pushed.filter((carton) => carton.x <= OUTPUT_CAPACITY * OUTPUT_STROKE);
}

/** A carton that left the station and was not ejected yet, stopped at `level`. */
function isStoppedAt(state: CartonSortingState, level: number): boolean {
	return (
		state.cartonExists &&
		!state.cartonPresent &&
		state.cartonXExtra === 0 &&
		Math.abs(state.cartonY - level) <= SENSOR_WINDOW
	);
}

const CartonSortingModel: SceneModel<
	CartonSortingState,
	CartonSortingInteraction
> = {
	createState() {
		return {
			cartonExists: false,
			cartonPresent: false,
			cartonTall: false,
			cartonPos: 0,
			cartonY: 0,
			cartonXExtra: 0,
			cylinders: { p1: 0, p2: 0, p3: 0 },
			cartonHigh: false,
			sortedCartons: [],
			t1Running: false,
			t2t3Running: false,
		};
	},

	step(state, dtMs, actuators) {
		const distance = SPEED_PER_MS * dtMs;
		const next: CartonSortingState = {
			...state,
			cylinders: { ...state.cylinders },
			t1Running: actuators.t1 === true,
			t2t3Running: actuators.t2t3 === true,
		};

		(["p1", "p2", "p3"] as CylinderKey[]).forEach((key) => {
			next.cylinders[key] = moveCylinder(
				state.cylinders[key],
				actuators[`${key}Out`] === true,
				actuators[`${key}In`] === true,
				distance,
				CYLINDER_STROKES[key],
			);
		});

		if (state.cartonPresent && actuators.t1 === true) {
			next.cartonPos = Math.min(T1_LENGTH, state.cartonPos + distance);
		}

		const atStation = state.cartonPresent && state.cartonPos >= T1_LENGTH;
		if (atStation) {
			next.cartonY = Math.max(state.cartonY, next.cylinders.p1);
		}
		if (next.cylinders.p1 >= CYLINDER_STROKES.p1) next.cartonPresent = false;

		const onChannel =
			state.cartonExists &&
			!state.cartonPresent &&
			state.cartonY >= P1_STROKE &&
			state.cartonXExtra === 0;
		if (onChannel && actuators.t2t3 === true) {
			const level = state.cartonTall ? CARTON_Y_P3 : CARTON_Y_P2;
			next.cartonY = Math.min(level, state.cartonY + distance);
		}

		const pushedBy = (cylinder: number, level: number) =>
			next.cartonY === level ? cylinder : 0;
		next.cartonXExtra = Math.max(
			state.cartonXExtra,
			pushedBy(next.cylinders.p2, CARTON_Y_P2),
			pushedBy(next.cylinders.p3, CARTON_Y_P3),
		);
		if (next.cartonXExtra > state.cartonXExtra) {
			next.sortedCartons = pushSortedCartons(
				state.sortedCartons,
				next.cartonY,
				next.cartonXExtra,
			);
		}
		return next;
	},

	readSensors(state): ScenePointValues {
		const atStation = state.cartonPresent && state.cartonPos >= T1_LENGTH;
		return {
			cartonAtStation: atStation,
			cartonHigh: atStation && state.cartonTall,
			cartonAtP2: isStoppedAt(state, CARTON_Y_P2),
			cartonAtP3: isStoppedAt(state, CARTON_Y_P3),
			p1AtOut: state.cylinders.p1 >= CYLINDER_STROKES.p1,
			p1AtIn: state.cylinders.p1 <= 0,
			p2AtOut: state.cylinders.p2 >= CYLINDER_STROKES.p2,
			p2AtIn: state.cylinders.p2 <= 0,
			p3AtOut: state.cylinders.p3 >= CYLINDER_STROKES.p3,
			p3AtIn: state.cylinders.p3 <= 0,
		};
	},

	applyInteraction(state, interaction) {
		if (interaction.type === "setCartonHigh") {
			return { ...state, cartonHigh: interaction.high };
		}
		if (!canPlaceCarton(state)) return state;
		return {
			...state,
			sortedCartons: archiveEjectedCarton(state),
			cartonExists: true,
			cartonPresent: true,
			cartonTall: state.cartonHigh,
			cartonPos: 0,
			cartonY: 0,
			cartonXExtra: 0,
		};
	},
};

export default CartonSortingModel;
