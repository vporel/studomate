import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import StepPreCompiler from "./step.pre-compiler";

describe("StepPreCompiler", () => {
	describe("preCompile", () => {
		it("compiles an initial step with step number 1", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(true).build();
			const grafcet = new GrafcetBuilder().addStep(step).build();

			const result = StepPreCompiler.preCompile(step, grafcet);

			expect(result.node.type).toBe("IDENTIFIER");
			expect(result.node.value).toBe("X1");
			expect(result.initial).toBe(true);
			expect(result.branches).toEqual([]);
		});

		it("compiles a non-initial step", () => {
			const step = new StepBuilder().id("step-1").number(5).initial(false).build();
			const grafcet = new GrafcetBuilder().addStep(step).build();

			const result = StepPreCompiler.preCompile(step, grafcet);

			expect(result.node.value).toBe("X5");
			expect(result.initial).toBe(false);
		});

		it("compiles step with single predecessor branch", () => {
			const step0 = new StepBuilder().id("step-0").number(0).initial(true).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const step1 = new StepBuilder().id("step-1").number(1).initial(false).build();
			const c1 = new ConnectionBuilder()
				.source("step", "step-0", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addTransition(trans1)
				.addConnection(c1)
				.addConnection(c2)
				.build();

			const result = StepPreCompiler.preCompile(step1, grafcet);

			expect(result.branches).toHaveLength(1);
			expect(result.branches[0].transitionId).toBe("trans-1");
			expect(result.branches[0].stepsIdsBeforeTransition).toEqual(["step-0"]);
		});

		it("compiles step with multiple predecessor branches (OR divergence)", () => {
			const step0 = new StepBuilder().id("step-0").number(0).initial(true).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial(false).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1 = VRAI").build();
			const trans2 = new TransitionBuilder().id("trans-2").expression("E2 = VRAI").build();
			const step2 = new StepBuilder().id("step-2").number(2).initial(false).build();

			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addStep(step2)
				.addTransition(trans1)
				.addTransition(trans2)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-1", "source:successor")
						.target("transition", "trans-2", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-2", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const result = StepPreCompiler.preCompile(step2, grafcet);

			expect(result.branches).toHaveLength(2);
			expect(result.branches[0].transitionId).toBe("trans-1");
			expect(result.branches[0].stepsIdsBeforeTransition).toEqual(["step-0"]);
			expect(result.branches[1].transitionId).toBe("trans-2");
			expect(result.branches[1].stepsIdsBeforeTransition).toEqual(["step-1"]);
		});

		it("compiles step with AND synchronization (multiple steps before transition)", () => {
			const step0 = new StepBuilder().id("step-0").number(0).initial(true).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial(true).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const step2 = new StepBuilder().id("step-2").number(2).initial(false).build();

			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addStep(step2)
				.addTransition(trans1)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-1", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const result = StepPreCompiler.preCompile(step2, grafcet);

			expect(result.branches).toHaveLength(1);
			expect(result.branches[0].transitionId).toBe("trans-1");
			expect(result.branches[0].stepsIdsBeforeTransition).toHaveLength(2);
			expect(result.branches[0].stepsIdsBeforeTransition).toContain("step-0");
			expect(result.branches[0].stepsIdsBeforeTransition).toContain("step-1");
		});

		it("generates correct step variable mnemonics", () => {
			const step3 = new StepBuilder().id("step-3").number(3).build();
			const step10 = new StepBuilder().id("step-10").number(10).build();
			const step99 = new StepBuilder().id("step-99").number(99).build();

			const grafcet = new GrafcetBuilder().addStep(step3).addStep(step10).addStep(step99).build();

			const result3 = StepPreCompiler.preCompile(step3, grafcet);
			const result10 = StepPreCompiler.preCompile(step10, grafcet);
			const result99 = StepPreCompiler.preCompile(step99, grafcet);

			expect(result3.node.value).toBe("X3");
			expect(result10.node.value).toBe("X10");
			expect(result99.node.value).toBe("X99");
		});

		it("sets initial to false when step.data.initial is undefined", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder().addStep(step).build();

			const result = StepPreCompiler.preCompile(step, grafcet);

			expect(result.initial).toBe(false);
		});
	});
});
