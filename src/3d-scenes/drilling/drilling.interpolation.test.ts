import interpolateDrilling from "./drilling.interpolation";

const from = { position: 10, spindleAngle: 1, holeProgress: 0 };
const to = { position: 20, spindleAngle: 3, holeProgress: 0.5 };

describe("interpolateDrilling", () => {
	it("blends the drill position, the spindle angle and the hole progress", () => {
		expect(interpolateDrilling(from, to, 0.5)).toEqual({
			position: 15,
			spindleAngle: 2,
			holeProgress: 0.25,
		});
	});

	it("gives each end state at ratio 0 and 1", () => {
		expect(interpolateDrilling(from, to, 0)).toEqual(from);
		expect(interpolateDrilling(from, to, 1)).toEqual(to);
	});
});
