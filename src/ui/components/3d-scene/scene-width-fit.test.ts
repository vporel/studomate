import { Vector3 } from "three";
import {
	SCENE_REFERENCE_ASPECT,
	scaleDistanceToTarget,
	widthFitDistanceFactor,
} from "./scene-width-fit";

describe("widthFitDistanceFactor", () => {
	it.each([
		["as wide as the reference", SCENE_REFERENCE_ASPECT],
		["wider than the reference", 16 / 9],
	])("keeps the framing distance for a view %s", (_label, aspect) => {
		expect(widthFitDistanceFactor(aspect)).toBe(1);
	});

	it("moves the camera back in proportion for a narrower view", () => {
		expect(widthFitDistanceFactor(0.5, 4 / 3)).toBeCloseTo(8 / 3);
		expect(widthFitDistanceFactor(2 / 3, 4 / 3)).toBeCloseTo(2);
	});

	it.each([0, -1, Number.NaN])(
		"keeps the framing distance for a view without size (%p)",
		(aspect) => {
			expect(widthFitDistanceFactor(aspect)).toBe(1);
		},
	);
});

describe("scaleDistanceToTarget", () => {
	it("moves the position along its line to the target", () => {
		const position = new Vector3(5, 3, 1);
		scaleDistanceToTarget(position, new Vector3(1, 1, 1), 2);
		expect(position.toArray()).toEqual([9, 5, 1]);
	});

	it("brings it back closer with a ratio under 1", () => {
		const position = new Vector3(9, 5, 1);
		scaleDistanceToTarget(position, new Vector3(1, 1, 1), 0.5);
		expect(position.toArray()).toEqual([5, 3, 1]);
	});
});
