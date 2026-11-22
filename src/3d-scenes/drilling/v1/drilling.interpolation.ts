import type { DrillingState } from "./drilling.model";
import { lerp } from "@/lib/number";

/** Blend of two consecutive states for a smooth rendering of the drill and the spindle. */
export default function interpolateDrilling(
	from: DrillingState,
	to: DrillingState,
	ratio: number,
): DrillingState {
	return {
		...to,
		position: lerp(from.position, to.position, ratio),
		spindleAngle: lerp(from.spindleAngle, to.spindleAngle, ratio),
		holeProgress: lerp(from.holeProgress, to.holeProgress, ratio),
	};
}
