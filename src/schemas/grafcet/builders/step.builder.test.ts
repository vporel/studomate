import Step from "../step.schema";
import StepBuilder from "./step.builder";

describe("StepBuilder", () => {
	it("builds a step with default values", () => {
		const step = new StepBuilder().id("step-1").build();

		expect(step).toBeInstanceOf(Step);
		expect(step.id).toBe("step-1");
		expect(step.type).toBe("step");
		expect(step.data.number).toBe("");
		expect(step.data.initial).toBe(false);
		expect(step.data.width).toBe(Step.DEFAULT_DIMENSIONS.width);
		expect(step.data.height).toBe(Step.DEFAULT_DIMENSIONS.height);
		expect(step.position).toEqual({ x: 0, y: 0 });
	});

	it("builds a step with custom number", () => {
		const step = new StepBuilder().id("step-1").number(5).build();

		expect(step.data.number).toBe(5);
	});

	it("builds an initial step", () => {
		const step = new StepBuilder().id("step-1").initial().build();

		expect(step.data.initial).toBe(true);
	});

	it("builds a non-initial step when initial(false) is called", () => {
		const step = new StepBuilder().id("step-1").initial(false).build();

		expect(step.data.initial).toBe(false);
	});

	it("builds a step with custom dimensions", () => {
		const step = new StepBuilder().id("step-1").dimensions(60, 60).build();

		expect(step.data.width).toBe(60);
		expect(step.data.height).toBe(60);
	});

	it("builds a step with custom position", () => {
		const step = new StepBuilder().id("step-1").position(100, 200).build();

		expect(step.position).toEqual({ x: 100, y: 200 });
	});

	it("builds a complete step with all properties", () => {
		const step = new StepBuilder()
			.id("step-1")
			.number(10)
			.initial()
			.dimensions(50, 50)
			.position(150, 250)
			.build();

		expect(step.id).toBe("step-1");
		expect(step.data.number).toBe(10);
		expect(step.data.initial).toBe(true);
		expect(step.data.width).toBe(50);
		expect(step.data.height).toBe(50);
		expect(step.position).toEqual({ x: 150, y: 250 });
	});

	it("allows method chaining", () => {
		const builder = new StepBuilder();
		const result = builder.id("step-1");

		expect(result).toBe(builder);
	});

	it("builds multiple steps independently", () => {
		const step1 = new StepBuilder().id("step-1").number(1).build();
		const step2 = new StepBuilder().id("step-2").number(2).build();

		expect(step1.id).toBe("step-1");
		expect(step1.data.number).toBe(1);
		expect(step2.id).toBe("step-2");
		expect(step2.data.number).toBe(2);
	});
});
