import type { ElevatorState } from "./elevator.model";
import { lerp } from "@/lib/number";

/** Blend of two consecutive states for a smooth rendering of the cabin and the door. */
export default function interpolateElevator(
	from: ElevatorState,
	to: ElevatorState,
	ratio: number,
): ElevatorState {
	return {
		...to,
		position: lerp(from.position, to.position, ratio),
		doorPosition: lerp(from.doorPosition, to.doorPosition, ratio),
	};
}
