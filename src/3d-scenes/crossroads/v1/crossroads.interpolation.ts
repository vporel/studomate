import { LANE_KEYS, type CrossroadsState } from "./crossroads.model";

/**
 * Blend of two consecutive states for a smooth rendering. A car is matched by its id: a car
 * absent from the earlier state (new one, or plant emptied after a collision) is shown at its
 * place at once.
 */
export default function interpolateCrossroads(
	from: CrossroadsState,
	to: CrossroadsState,
	ratio: number,
): CrossroadsState {
	const lanes = { ...to.lanes };
	for (const key of LANE_KEYS) {
		const earlier = new Map(from.lanes[key].map((car) => [car.id, car]));
		lanes[key] = to.lanes[key].map((car) => {
			const before = earlier.get(car.id);
			if (!before) return car;
			return { ...car, s: before.s + (car.s - before.s) * ratio };
		});
	}
	return { ...to, lanes };
}
