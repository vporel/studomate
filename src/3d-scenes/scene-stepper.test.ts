import type { SceneModel } from "./scene-model";
import SceneStepper from "./scene-stepper";

type State = { steps: number; level: number; pulseAt: number[] };

/** Counts the sub-steps; `pulse` is true during the sub-steps listed in `pulseAt`. */
const model: SceneModel<State, { type: "reset" }> = {
	createState: () => ({ steps: 0, level: 0, pulseAt: [] }),
	step: (state, dtMs, actuators) => ({
		...state,
		steps: state.steps + 1,
		level: state.level + dtMs * (actuators.rate as number),
	}),
	readSensors: (state) => ({
		pulse: state.pulseAt.includes(state.steps),
		inverted: !state.pulseAt.includes(state.steps),
		level: state.level,
	}),
	applyInteraction: (state) => ({ ...state, steps: 0 }),
};

function stepperWithPulses(pulseAt: number[]) {
	const stepper = new SceneStepper(model, 10);
	(stepper.getState() as State).pulseAt = pulseAt;
	return stepper;
}

describe("SceneStepper", () => {
	it("runs the model by fixed sub-steps and carries the remainder over", () => {
		const stepper = new SceneStepper(model, 10);
		stepper.advance(15, { rate: 0 });
		expect(stepper.getState().steps).toBe(1);
		stepper.advance(15, { rate: 0 });
		expect(stepper.getState().steps).toBe(3);
		expect(stepper.getSimTimeMs()).toBe(30);
	});

	it("runs no sub-step for a cycle shorter than a sub-step", () => {
		const stepper = new SceneStepper(model, 10);
		stepper.advance(4, { rate: 0 });
		expect(stepper.getState().steps).toBe(0);
		expect(stepper.getSimTimeMs()).toBe(0);
	});

	it("reports a boolean pulse that rises and falls inside a long cycle", () => {
		const stepper = stepperWithPulses([3]);
		const sensors = stepper.advance(100, { rate: 0 });
		expect(sensors.pulse).toBe(true);
		expect(stepper.readSensors().pulse).toBe(false);
	});

	it("reports a boolean sensor that drops to false for a sub-step then recovers", () => {
		const stepper = stepperWithPulses([3]);
		expect(stepper.readSensors().inverted).toBe(true);
		const sensors = stepper.advance(100, { rate: 0 });
		expect(sensors.inverted).toBe(false);
		expect(stepper.readSensors().inverted).toBe(true);
	});

	it("reports the start value of a sensor that never changes during the cycle", () => {
		const stepper = stepperWithPulses([]);
		expect(stepper.advance(100, { rate: 0 }).pulse).toBe(false);
	});

	it("gives a numeric sensor the value of the last sub-step", () => {
		const stepper = new SceneStepper(model, 10);
		const sensors = stepper.advance(50, { rate: 1 });
		expect(sensors.level).toBe(50);
	});

	it("reaches the same state whatever the cycle split with constant actuators", () => {
		const whole = new SceneStepper(model, 10);
		whole.advance(60, { rate: 2 });
		const split = new SceneStepper(model, 10);
		[15, 15, 30].forEach((dt) => split.advance(dt, { rate: 2 }));
		expect(split.getState()).toEqual(whole.getState());
		expect(split.getSimTimeMs()).toBe(whole.getSimTimeMs());
	});

	it("restores the initial state and time on reset", () => {
		const stepper = new SceneStepper(model, 10);
		stepper.advance(35, { rate: 1 });
		stepper.reset();
		expect(stepper.getState()).toEqual(model.createState());
		expect(stepper.getSimTimeMs()).toBe(0);
		stepper.advance(5, { rate: 0 });
		stepper.advance(5, { rate: 0 });
		expect(stepper.getState().steps).toBe(1);
	});

	it("applies an interaction through the model", () => {
		const stepper = new SceneStepper(model, 10);
		stepper.advance(30, { rate: 0 });
		stepper.applyInteraction({ type: "reset" });
		expect(stepper.getState().steps).toBe(0);
	});
});
