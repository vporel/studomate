import CartonSortingDescriptor from "./carton-sorting.descriptor";
import CartonSortingModel, {
	canPlaceCarton,
	CARTON_Y_P2,
	CARTON_Y_P3,
	CYLINDER_STROKES,
	OUTPUT_STROKE,
	P1_STROKE,
	START_MIN_PRESS_MS,
	SPEED_PER_MS,
	T1_LENGTH,
} from "./carton-sorting.model";
import type { ScenePointValues } from "@/3d-scenes/scene-model";
import SceneStepper from "@/3d-scenes/scene-stepper";

const ms = (distance: number) => distance / SPEED_PER_MS;
const T1_MS = ms(T1_LENGTH);

function createStepper() {
	return new SceneStepper(CartonSortingModel);
}

type Stepper = ReturnType<typeof createStepper>;

function runUntilAtStation(stepper: Stepper, high = false) {
	stepper.applyInteraction({ type: "setCartonHigh", high });
	stepper.applyInteraction({ type: "newCarton" });
	stepper.advance(T1_MS + 20, { t1: true });
}

/** P1 pushes the carton onto the channel, then T2/T3 carries it to its level. */
function runUntilAtLevel(stepper: Stepper, high = false) {
	runUntilAtStation(stepper, high);
	stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
	stepper.advance(ms(CARTON_Y_P3) + 100, { t2t3: true });
}

describe("carton sorting model", () => {
	it("reports which conveyors are driven", () => {
		const stepper = createStepper();
		stepper.advance(50, { t1: true });
		expect(stepper.getState()).toMatchObject({
			t1Running: true,
			t2t3Running: false,
		});
		stepper.advance(50, { t2t3: true });
		expect(stepper.getState()).toMatchObject({
			t1Running: false,
			t2t3Running: true,
		});
	});

	it("starts with retracted cylinders and no carton", () => {
		const sensors = CartonSortingModel.readSensors(
			CartonSortingModel.createState(),
		);
		expect(sensors).toMatchObject({
			cartonAtStation: false,
			cartonAtP2: false,
			cartonAtP3: false,
			p1AtIn: true,
			p2AtIn: true,
			p3AtIn: true,
			p1AtOut: false,
		});
	});

	it("exposes a sensor for every sensor point of its descriptor", () => {
		const sensors = CartonSortingModel.readSensors(
			CartonSortingModel.createState(),
		);
		const sensorIds = CartonSortingDescriptor.points
			.filter((p) => p.kind === "sensor")
			.map((p) => p.id);
		expect(Object.keys(sensors).sort()).toEqual(sensorIds.sort());
	});

	it("gives P1 a short stroke and P2 and P3 a short stroke of their own", () => {
		expect(CYLINDER_STROKES).toEqual({
			p1: P1_STROKE,
			p2: OUTPUT_STROKE,
			p3: OUTPUT_STROKE,
		});
		expect(P1_STROKE).toBeLessThan(CARTON_Y_P2);
	});

	it("does not move a new carton while T1 is stopped", () => {
		const stepper = createStepper();
		stepper.applyInteraction({ type: "newCarton" });
		stepper.advance(20000, {});
		expect(stepper.readSensors().cartonAtStation).toBe(false);
		expect(stepper.getState().cartonPos).toBe(0);
	});

	it("brings the carton to the station after the T1 travel time", () => {
		const stepper = createStepper();
		stepper.applyInteraction({ type: "newCarton" });
		stepper.advance(T1_MS - 200, { t1: true });
		expect(stepper.readSensors().cartonAtStation).toBe(false);
		stepper.advance(400, { t1: true });
		expect(stepper.readSensors().cartonAtStation).toBe(true);
		expect(stepper.getState().cartonPos).toBe(T1_LENGTH);
	});

	describe("carton height", () => {
		it("is fixed when the carton is generated, not read live from the switch", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper, false);
			stepper.applyInteraction({ type: "setCartonHigh", high: true });
			expect(stepper.readSensors().cartonHigh).toBe(false);
			expect(stepper.getState().cartonTall).toBe(false);
		});

		it("is reported by the sensor of the station for a high carton", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper, true);
			expect(stepper.readSensors().cartonHigh).toBe(true);
		});
	});

	describe("cylinders", () => {
		it("reach the out limit switch after their own stroke time and the in switch when back", () => {
			const stepper = createStepper();
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			expect(stepper.readSensors()).toMatchObject({
				p2AtOut: true,
				p2AtIn: false,
			});
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2In: true });
			expect(stepper.readSensors()).toMatchObject({
				p2AtOut: false,
				p2AtIn: true,
			});
		});

		it("do not reach their out limit switch before their stroke is done", () => {
			const stepper = createStepper();
			stepper.advance(ms(P1_STROKE) - 100, { p1Out: true });
			expect(stepper.readSensors().p1AtOut).toBe(false);
		});

		it("stay still when both directions are commanded", () => {
			const stepper = createStepper();
			stepper.advance(1000, { p1Out: true, p1In: true });
			expect(stepper.getState().cylinders.p1).toBe(0);
		});

		it("saturate at their stroke", () => {
			const stepper = createStepper();
			stepper.advance(ms(OUTPUT_STROKE) * 3, { p3Out: true });
			expect(stepper.getState().cylinders.p3).toBe(CYLINDER_STROKES.p3);
		});
	});

	describe("P1 and the channel", () => {
		it("pushes the carton off T1 onto the channel and releases the station", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper);
			stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
			const state = stepper.getState();
			expect(state.cartonY).toBe(P1_STROKE);
			expect(state.cartonPresent).toBe(false);
			expect(stepper.readSensors()).toMatchObject({
				cartonAtStation: false,
				p1AtOut: true,
			});
		});

		it("keeps the carton at the channel entry while T2/T3 is stopped", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper);
			stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
			stepper.advance(20000, { p1In: true });
			expect(stepper.getState().cartonY).toBe(P1_STROKE);
		});

		it("does not carry a carton that has not been pushed onto the channel", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper);
			stepper.advance(10000, { t2t3: true });
			expect(stepper.getState().cartonY).toBe(0);
		});

		it("carries a low carton to P2's level and stops it there", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, false);
			expect(stepper.getState().cartonY).toBe(CARTON_Y_P2);
			expect(stepper.readSensors()).toMatchObject({
				cartonAtP2: true,
				cartonAtP3: false,
			});
		});

		it("carries a high carton on to P3's level and stops it there", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, true);
			expect(stepper.getState().cartonY).toBe(CARTON_Y_P3);
			expect(stepper.readSensors()).toMatchObject({
				cartonAtP2: false,
				cartonAtP3: true,
			});
		});

		it("makes the P2 sensor pulse when a high carton goes by", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper, true);
			stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
			const seen: boolean[] = [];
			for (let i = 0; i < 400; i++) {
				seen.push(stepper.advance(10, { t2t3: true }).cartonAtP2 === true);
			}
			expect(seen).toContain(true);
			expect(seen[seen.length - 1]).toBe(false);
		});
	});

	describe("ejection", () => {
		it("ejects a low carton with P2 onto its output", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, false);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			expect(stepper.getState().cartonXExtra).toBe(OUTPUT_STROKE);
			expect(stepper.readSensors().cartonAtP2).toBe(false);
		});

		it("ejects a high carton with P3 onto its output", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, true);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p3Out: true });
			expect(stepper.getState().cartonXExtra).toBe(OUTPUT_STROKE);
		});

		it("does not eject with P2 a carton stopped at P3's level", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, true);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			expect(stepper.getState().cartonXExtra).toBe(0);
		});

		it("does not eject with P3 a carton stopped at P2's level", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, false);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p3Out: true });
			expect(stepper.getState().cartonXExtra).toBe(0);
		});

		it("keeps the ejected carton on its output when the cylinder retracts", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, false);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2In: true, t2t3: true });
			expect(stepper.getState()).toMatchObject({
				cartonXExtra: OUTPUT_STROKE,
				cartonY: CARTON_Y_P2,
			});
		});

		it("never lets a head go ahead of the carton it pushes", () => {
			for (const key of ["p2Out", "p3Out"] as const) {
				const stepper = createStepper();
				runUntilAtLevel(stepper, key === "p3Out");
				const cylinder = key === "p2Out" ? "p2" : "p3";
				for (let i = 0; i < 400; i++) {
					stepper.advance(10, { [key]: true });
					expect(stepper.getState().cylinders[cylinder]).toBeLessThanOrEqual(
						stepper.getState().cartonXExtra + 1e-9,
					);
				}
			}
		});
	});

	it("keeps an existing carton in the plant after it left the station", () => {
		const stepper = createStepper();
		expect(stepper.getState().cartonExists).toBe(false);
		runUntilAtStation(stepper);
		expect(stepper.getState().cartonExists).toBe(true);
		stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
		expect(stepper.getState()).toMatchObject({
			cartonPresent: false,
			cartonExists: true,
		});
	});

	describe("placing a carton", () => {
		/** Sorts the carton and retracts the cylinders: the station is back at rest. */
		function sortOne(stepper: Stepper, high = false) {
			runUntilAtLevel(stepper, high);
			const out: ScenePointValues = high ? { p3Out: true } : { p2Out: true };
			const back: ScenePointValues = high ? { p3In: true } : { p2In: true };
			stepper.advance(ms(OUTPUT_STROKE) + 20, { ...out, p1Out: true });
			stepper.advance(ms(OUTPUT_STROKE) + 20, { ...back, p1In: true });
			stepper.advance(ms(P1_STROKE) + 20, { p1In: true });
		}

		it("is possible on a station at rest, with no carton yet", () => {
			expect(canPlaceCarton(CartonSortingModel.createState())).toBe(true);
		});

		it("is refused while a carton is in transit, which leaves the state untouched", () => {
			const stepper = createStepper();
			runUntilAtStation(stepper);
			const before = structuredClone(stepper.getState());
			expect(canPlaceCarton(before)).toBe(false);
			stepper.applyInteraction({ type: "newCarton" });
			expect(stepper.getState()).toEqual(before);
		});

		it("is refused while a cylinder is not retracted, even once the carton is ejected", () => {
			const stepper = createStepper();
			runUntilAtLevel(stepper, false);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true, p1Out: true });
			expect(stepper.getState().cartonXExtra).toBe(OUTPUT_STROKE);
			expect(canPlaceCarton(stepper.getState())).toBe(false);
		});

		it("is possible again once the carton is sorted and the cylinders are back", () => {
			const stepper = createStepper();
			sortOne(stepper);
			expect(canPlaceCarton(stepper.getState())).toBe(true);
		});

		it("archives the sorted carton on its output when the next one is placed", () => {
			const stepper = createStepper();
			sortOne(stepper, false);
			stepper.applyInteraction({ type: "newCarton" });
			expect(stepper.getState().sortedCartons).toEqual([
				{ y: CARTON_Y_P2, x: OUTPUT_STROKE, tall: false },
			]);
			expect(stepper.getState()).toMatchObject({
				cartonPresent: true,
				cartonPos: 0,
				cartonY: 0,
				cartonXExtra: 0,
			});
		});

		/** Places a carton and brings it to the ejection level, ready for its cylinder. */
		function placeAtLevel(stepper: Stepper, high = false) {
			stepper.applyInteraction({ type: "setCartonHigh", high });
			stepper.applyInteraction({ type: "newCarton" });
			stepper.advance(T1_MS + 20, { t1: true });
			stepper.advance(ms(P1_STROKE) + 20, { p1Out: true });
			stepper.advance(ms(CARTON_Y_P3) + 100, { t2t3: true });
		}

		it("pushes the cartons of an output along as the next one is ejected", () => {
			const stepper = createStepper();
			sortOne(stepper, false);
			placeAtLevel(stepper);
			stepper.advance(ms(OUTPUT_STROKE / 2), { p2Out: true });
			const [pushed] = stepper.getState().sortedCartons;
			expect(pushed.x).toBeGreaterThan(OUTPUT_STROKE);
			expect(pushed.x).toBeLessThan(2 * OUTPUT_STROKE);
			stepper.advance(ms(OUTPUT_STROKE), { p2Out: true });
			expect(stepper.getState().sortedCartons).toEqual([
				{ y: CARTON_Y_P2, x: 2 * OUTPUT_STROKE, tall: false },
			]);
		});

		it("never overlaps the carton being ejected with the one it pushes", () => {
			const stepper = createStepper();
			sortOne(stepper, false);
			placeAtLevel(stepper);
			for (let i = 0; i < 100; i++) {
				stepper.advance(10, { p2Out: true });
				const state = stepper.getState();
				state.sortedCartons.forEach((carton) =>
					expect(carton.x - state.cartonXExtra).toBeGreaterThanOrEqual(
						OUTPUT_STROKE - 1e-9,
					),
				);
			}
		});

		it("leaves the cartons of the other output where they are", () => {
			const stepper = createStepper();
			sortOne(stepper, true);
			placeAtLevel(stepper, false);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			expect(stepper.getState().sortedCartons).toEqual([
				{ y: CARTON_Y_P3, x: OUTPUT_STROKE, tall: true },
			]);
		});

		it("pushes a chain of cartons, each one shoving the next", () => {
			const state = {
				...CartonSortingModel.createState(),
				cartonExists: true,
				cartonY: CARTON_Y_P2,
				cartonXExtra: 10,
				sortedCartons: [
					{ y: CARTON_Y_P2, x: OUTPUT_STROKE, tall: false },
					{ y: CARTON_Y_P2, x: OUTPUT_STROKE + 5, tall: true },
				],
			};
			const next = CartonSortingModel.step(
				{ ...state, cartonXExtra: 0, cylinders: { p1: 0, p2: 10, p3: 0 } },
				1,
				{ p2Out: true },
			);
			expect(next.sortedCartons.map((carton) => carton.x)).toEqual([
				next.cartonXExtra + 2 * OUTPUT_STROKE,
				next.cartonXExtra + OUTPUT_STROKE,
			]);
		});

		it("drops the cartons pushed beyond the capacity once the ejection is complete", () => {
			const stepper = createStepper();
			sortOne(stepper, false);
			placeAtLevel(stepper);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true, p1Out: true });
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2In: true, p1In: true });
			stepper.advance(ms(P1_STROKE) + 20, { p1In: true });
			placeAtLevel(stepper);
			stepper.advance(ms(OUTPUT_STROKE) / 2, { p2Out: true });
			expect(stepper.getState().sortedCartons).toHaveLength(2);
			stepper.advance(ms(OUTPUT_STROKE) + 20, { p2Out: true });
			expect(stepper.getState().sortedCartons).toEqual([
				{ y: CARTON_Y_P2, x: 2 * OUTPUT_STROKE, tall: false },
			]);
		});

		it("gives back an empty plant after a reset", () => {
			const stepper = createStepper();
			sortOne(stepper);
			stepper.applyInteraction({ type: "newCarton" });
			stepper.reset();
			expect(stepper.getState().sortedCartons).toEqual([]);
		});
	});

	it("does not mutate the previous state", () => {
		const state = CartonSortingModel.createState();
		const frozen = structuredClone(state);
		CartonSortingModel.step(state, 10, { p1Out: true, t1: true, t2t3: true });
		expect(state).toEqual(frozen);
	});

	describe("start button", () => {
		it("reads as released at the start", () => {
			expect(createStepper().readSensors().startButton).toBe(false);
		});

		it("reads as pressed while it is held, however long", () => {
			const stepper = createStepper();
			stepper.applyInteraction({ type: "pressStart" });
			stepper.advance(START_MIN_PRESS_MS * 5, {});
			expect(stepper.readSensors().startButton).toBe(true);
			stepper.applyInteraction({ type: "releaseStart" });
			stepper.advance(START_MIN_PRESS_MS + 20, {});
			expect(stepper.readSensors().startButton).toBe(false);
		});

		it("stays pressed for a minimum time after a click shorter than a PLC cycle", () => {
			const stepper = createStepper();
			stepper.applyInteraction({ type: "pressStart" });
			stepper.applyInteraction({ type: "releaseStart" });
			expect(stepper.advance(100, {}).startButton).toBe(true);
			expect(stepper.advance(100, {}).startButton).toBe(true);
			stepper.advance(START_MIN_PRESS_MS, {});
			expect(stepper.advance(100, {}).startButton).toBe(false);
		});

		it("is not mistaken for a carton interaction", () => {
			const stepper = createStepper();
			stepper.applyInteraction({ type: "pressStart" });
			expect(stepper.getState()).toMatchObject({
				cartonExists: false,
				cartonHigh: false,
			});
		});
	});

	describe("counter display", () => {
		it("is unknown until a value is given", () => {
			const stepper = createStepper();
			expect(stepper.getState().counter).toBeNull();
			stepper.advance(20, {});
			expect(stepper.getState().counter).toBeNull();
		});

		it("shows the value the PLC gives it, and forgets it when unbound", () => {
			const stepper = createStepper();
			stepper.advance(20, { counter: 3 });
			expect(stepper.getState().counter).toBe(3);
			stepper.advance(20, { counter: 4 });
			expect(stepper.getState().counter).toBe(4);
			stepper.advance(20, {});
			expect(stepper.getState().counter).toBeNull();
		});

		it("ignores a boolean value", () => {
			const stepper = createStepper();
			stepper.advance(20, { counter: true });
			expect(stepper.getState().counter).toBeNull();
		});
	});

	describe("cylinder commands", () => {
		it("remember the commands of the last cycle, for each cylinder", () => {
			const stepper = createStepper();
			stepper.advance(20, { p1Out: true, p2In: true, p3Out: true });
			expect(stepper.getState().commands).toEqual({
				p1Out: true,
				p1In: false,
				p2Out: false,
				p2In: true,
				p3Out: true,
				p3In: false,
			});
			stepper.advance(20, {});
			expect(Object.values(stepper.getState().commands)).not.toContain(true);
		});
	});
});
