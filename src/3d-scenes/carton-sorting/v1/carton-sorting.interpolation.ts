import type { CartonSortingState } from "./carton-sorting.model";
import { lerp } from "@/lib/number";

/**
 * Blend of two consecutive states for a smooth rendering. A carton that goes back to the start
 * (a new carton) is shown at its new place at once instead of sliding back. A sorted carton
 * shoved along its output slides with the carton that pushes it.
 */
export default function interpolateCartonSorting(
	from: CartonSortingState,
	to: CartonSortingState,
	ratio: number,
): CartonSortingState {
	const respawned =
		to.cartonPos < from.cartonPos ||
		to.cartonY < from.cartonY ||
		to.cartonXExtra < from.cartonXExtra;
	const carton = (a: number, b: number) => (respawned ? b : lerp(a, b, ratio));
	return {
		...to,
		sortedCartons: to.sortedCartons.map((sorted, index) => {
			const before = from.sortedCartons[index];
			const sameCarton =
				before !== undefined &&
				before.y === sorted.y &&
				before.tall === sorted.tall &&
				before.x <= sorted.x;
			return sameCarton
				? { ...sorted, x: lerp(before.x, sorted.x, ratio) }
				: sorted;
		}),
		cartonPos: carton(from.cartonPos, to.cartonPos),
		cartonY: carton(from.cartonY, to.cartonY),
		cartonXExtra: carton(from.cartonXExtra, to.cartonXExtra),
		cylinders: {
			p1: lerp(from.cylinders.p1, to.cylinders.p1, ratio),
			p2: lerp(from.cylinders.p2, to.cylinders.p2, ratio),
			p3: lerp(from.cylinders.p3, to.cylinders.p3, ratio),
		},
	};
}
