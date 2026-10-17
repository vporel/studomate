import type { ParkingState } from "./parking.model";
import { mix } from "@/3d-scenes/scene-math";

/**
 * Blend of two consecutive states for a smooth rendering. A car is matched by its id: a car
 * absent from the earlier state (new one) is shown at its place at once, and a car that changed
 * phase jumps to its new path.
 */
export default function interpolateParking(
	from: ParkingState,
	to: ParkingState,
	ratio: number,
): ParkingState {
	const earlier = new Map(from.cars.map((car) => [car.id, car]));
	return {
		...to,
		barriers: {
			entry: mix(from.barriers.entry, to.barriers.entry, ratio),
			exit: mix(from.barriers.exit, to.barriers.exit, ratio),
		},
		cars: to.cars.map((car) => {
			const before = earlier.get(car.id);
			if (!before || before.phase !== car.phase) return car;
			return { ...car, s: mix(before.s, car.s, ratio) };
		}),
	};
}
