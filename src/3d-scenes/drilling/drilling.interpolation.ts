import type { DrillingState } from "./drilling.model";

function mix(from: number, to: number, ratio: number): number {
	return from + (to - from) * ratio;
}

/** Blend of two consecutive states for a smooth rendering of the drill and the spindle. */
export default function interpolateDrilling(
	from: DrillingState,
	to: DrillingState,
	ratio: number,
): DrillingState {
	return {
		position: mix(from.position, to.position, ratio),
		spindleAngle: mix(from.spindleAngle, to.spindleAngle, ratio),
		holeProgress: mix(from.holeProgress, to.holeProgress, ratio),
	};
}
