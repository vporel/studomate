import { LANE_KEYS } from "@/3d-scenes/crossroads/v1/crossroads.model";
import type { ScenePointValues } from "@/3d-scenes/scene-model";

const GREEN_MS = 6000;
const ORANGE_MS = 2000;
/** Long enough for a car that went through on orange to clear the crossing. */
const ALL_RED_MS = 2000;
const AXIS_PHASE_MS = GREEN_MS + ORANGE_MS + ALL_RED_MS;
export const LIGHT_CYCLE_MS = 2 * AXIS_PHASE_MS;

type Colour = "red" | "orange" | "green";

/** Actuator values of the crossroads model for a correct two-axis cycle, `tMs` into the loop. */
export function lightCycleAt(tMs: number): ScenePointValues {
	const t = ((tMs % LIGHT_CYCLE_MS) + LIGHT_CYCLE_MS) % LIGHT_CYCLE_MS;
	const activeAxis = t < AXIS_PHASE_MS ? "NS" : "EO";
	const inPhase = t % AXIS_PHASE_MS;
	const activeColour: Colour =
		inPhase < GREEN_MS
			? "green"
			: inPhase < GREEN_MS + ORANGE_MS
				? "orange"
				: "red";
	const values: ScenePointValues = {};
	for (const lane of LANE_KEYS) {
		const colour = lane.startsWith(activeAxis) ? activeColour : "red";
		values[`red${lane}`] = colour === "red";
		values[`orange${lane}`] = colour === "orange";
		values[`green${lane}`] = colour === "green";
	}
	return values;
}
