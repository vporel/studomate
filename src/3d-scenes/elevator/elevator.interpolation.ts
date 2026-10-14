import type { ElevatorState } from "./elevator.model";
import { mix } from "@/3d-scenes/scene-math";

/** Blend of two consecutive states for a smooth rendering of the cabin and the door. */
export default function interpolateElevator(
	from: ElevatorState,
	to: ElevatorState,
	ratio: number,
): ElevatorState {
	return {
		...to,
		position: mix(from.position, to.position, ratio),
		doorPosition: mix(from.doorPosition, to.doorPosition, ratio),
	};
}
