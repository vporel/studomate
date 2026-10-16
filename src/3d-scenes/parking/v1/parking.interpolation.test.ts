import interpolateParking from "./parking.interpolation";
import ParkingModel, { type Car } from "./parking.model";

const base = ParkingModel.createState();
const car = (overrides: Partial<Car>): Car => ({
	id: 0,
	phase: "arriving",
	stall: null,
	s: 0,
	...overrides,
});

describe("interpolateParking", () => {
	it("blends the opening of both barriers and the distance covered by a car", () => {
		const mid = interpolateParking(
			{ ...base, barriers: { entry: 0, exit: 20 }, cars: [car({ s: 10 })] },
			{ ...base, barriers: { entry: 50, exit: 40 }, cars: [car({ s: 30 })] },
			0.5,
		);
		expect(mid.barriers).toEqual({ entry: 25, exit: 30 });
		expect(mid.cars[0].s).toBe(20);
	});

	it("shows at once a car that was not in the earlier state", () => {
		const mid = interpolateParking(
			base,
			{ ...base, cars: [car({ id: 3, s: 40 })] },
			0.5,
		);
		expect(mid.cars[0].s).toBe(40);
	});

	it("shows at once a car that changed phase", () => {
		const mid = interpolateParking(
			{ ...base, cars: [car({ phase: "parked", stall: 1, s: 400 })] },
			{ ...base, cars: [car({ phase: "leaving", stall: 1, s: 0 })] },
			0.5,
		);
		expect(mid.cars[0]).toMatchObject({ phase: "leaving", s: 0 });
	});

	it("takes the other fields from the latest state", () => {
		const mid = interpolateParking(
			base,
			{ ...base, full: true, places: 4 },
			0.5,
		);
		expect(mid).toMatchObject({ full: true, places: 4 });
	});
});
