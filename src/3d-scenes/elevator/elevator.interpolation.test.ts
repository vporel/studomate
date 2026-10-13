import interpolateElevator from "./elevator.interpolation";
import ElevatorModel from "./elevator.model";

const base = ElevatorModel.createState();

describe("interpolateElevator", () => {
	it("blends the position of the cabin and the opening of the door", () => {
		const mid = interpolateElevator(
			{ ...base, position: 10, doorPosition: 0 },
			{ ...base, position: 20, doorPosition: 50 },
			0.5,
		);
		expect(mid.position).toBe(15);
		expect(mid.doorPosition).toBe(25);
	});

	it("gives each end state at ratio 0 and 1", () => {
		const from = { ...base, position: 10 };
		const to = { ...base, position: 30 };
		expect(interpolateElevator(from, to, 0).position).toBe(10);
		expect(interpolateElevator(from, to, 1).position).toBe(30);
	});

	it("takes the other fields from the latest state", () => {
		const mid = interpolateElevator(
			base,
			{ ...base, doorHoldElapsed: true, doorOpenMs: 500 },
			0.5,
		);
		expect(mid).toMatchObject({ doorHoldElapsed: true, doorOpenMs: 500 });
	});
});
