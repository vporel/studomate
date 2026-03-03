import Grafcet from "../grafcet.schema";
import GrafcetBuilder from "./grafcet.builder";
import StepBuilder from "./step.builder";
import TransitionBuilder from "./transition.builder";

describe("GrafcetBuilder", () => {
	it("builds an empty grafcet with default values", () => {
		const grafcet = new GrafcetBuilder().id("grafcet-1").build();

		expect(grafcet).toBeInstanceOf(Grafcet);
		expect(grafcet.id).toBe("grafcet-1");
		expect(grafcet.name).toBe("Sans titre");
		expect(grafcet.format).toEqual({ type: "A4", orientation: "portrait" });
		expect(grafcet.steps).toEqual([]);
		expect(grafcet.transitions).toEqual([]);
		expect(grafcet.actions).toEqual([]);
		expect(grafcet.comments).toEqual([]);
		expect(grafcet.connections).toEqual([]);
	});

	it("builds a grafcet with custom name", () => {
		const grafcet = new GrafcetBuilder().id("grafcet-1").name("Mon Grafcet").build();

		expect(grafcet.name).toBe("Mon Grafcet");
	});

	it("builds a grafcet with custom format", () => {
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.format({ type: "A3", orientation: "landscape" })
			.build();

		expect(grafcet.format).toEqual({ type: "A3", orientation: "landscape" });
	});

	it("builds a grafcet with one step", () => {
		const step = new StepBuilder().id("step-1").number(1).build();
		const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();

		expect(grafcet.steps).toHaveLength(1);
		expect(grafcet.steps[0].id).toBe("step-1");
	});

	it("builds a grafcet with multiple steps", () => {
		const step1 = new StepBuilder().id("step-1").number(1).build();
		const step2 = new StepBuilder().id("step-2").number(2).build();
		const grafcet = new GrafcetBuilder().id("grafcet-1").addSteps(step1, step2).build();

		expect(grafcet.steps).toHaveLength(2);
		expect(grafcet.steps[0].id).toBe("step-1");
		expect(grafcet.steps[1].id).toBe("step-2");
	});

	it("builds a grafcet with transitions", () => {
		const trans1 = new TransitionBuilder().id("trans-1").expression("true").build();
		const trans2 = new TransitionBuilder().id("trans-2").expression("x > 0").build();
		const grafcet = new GrafcetBuilder().id("grafcet-1").addTransitions(trans1, trans2).build();

		expect(grafcet.transitions).toHaveLength(2);
		expect(grafcet.transitions[0].id).toBe("trans-1");
		expect(grafcet.transitions[1].id).toBe("trans-2");
	});

	it("builds a complete grafcet with steps and transitions", () => {
		const step1 = new StepBuilder().id("step-1").number(1).initial().build();
		const step2 = new StepBuilder().id("step-2").number(2).build();
		const trans1 = new TransitionBuilder().id("trans-1").expression("true").build();

		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.name("Test Grafcet")
			.format({ type: "A4", orientation: "portrait" })
			.addSteps(step1, step2)
			.addTransition(trans1)
			.build();

		expect(grafcet.id).toBe("grafcet-1");
		expect(grafcet.name).toBe("Test Grafcet");
		expect(grafcet.steps).toHaveLength(2);
		expect(grafcet.transitions).toHaveLength(1);
	});

	it("allows method chaining", () => {
		const builder = new GrafcetBuilder();
		const result = builder.id("grafcet-1");

		expect(result).toBe(builder);
	});

	it("builds multiple grafcets independently", () => {
		const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("Grafcet 1").build();
		const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("Grafcet 2").build();

		expect(grafcet1.id).toBe("grafcet-1");
		expect(grafcet1.name).toBe("Grafcet 1");
		expect(grafcet2.id).toBe("grafcet-2");
		expect(grafcet2.name).toBe("Grafcet 2");
	});
});
