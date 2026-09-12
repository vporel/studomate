import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import TransitionPreCompiler from "./transition.pre-compiler";

describe("TransitionPreCompiler", () => {
	let variables: PLCVariable[];

	beforeEach(() => {
		variables = [
			new PLCVariable("v1", "E1", "input", "boolean"),
			new PLCVariable("v2", "M1", "memory", "boolean"),
			new PLCVariable("v3", "M2", "memory", "number"),
		];
	});

	describe("preCompile", () => {
		it("compiles a simple boolean expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node).toBeDefined();
			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles expression with VRAI literal", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			expect(result.timers).toEqual([]);
		});

		it("compiles expression with FAUX literal", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("FAUX")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			expect(result.timers).toEqual([]);
		});

		it("compiles AND expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI ET M1 = VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles OR expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI OU M1 = FAUX")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles numeric comparison", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("M2 > 10")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles timer expression and creates timer node", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/5s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.timers).toHaveLength(1);
			expect(result.timers[0].type).toBe("TIMER_BLOCK");
		});

		it("compiles timer with milliseconds", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/500ms")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.timers).toHaveLength(1);
			expect((result.timers[0].presetTime as any).value).toBe(500);
		});

		it("replaces timer declaration with timer node in AST", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/1s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			// The node should be a TIMER_BLOCK, not a TIMER_STRING_DECLARATION
			expect(result.node.type).toBe("TIMER_BLOCK");
			expect(result.timers).toHaveLength(1);
		});

		it("expose un pureNode où le TimerNode est remplacé par la lecture de sa sortie", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/1s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.node.type).toBe("TIMER_BLOCK");
			// pureNode ne contient plus de TIMER_BLOCK : c'est une lecture d'identifiant
			expect(result.pureNode.type).toBe("IDENTIFIER");
			expect((result.pureNode as any).value).toBe(
				(result.timers[0].output as any).value,
			);
		});

		it("pureNode est identique au node en l'absence de tempo", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("A ET B")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.pureNode).toBe(result.node);
		});

		it("generates synthetic memo variables for timers", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/2s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();
			const initialVariablesCount = variables.length;

			TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			// Each timer requires 3 memo variables: lastInput, elapsedTime, output
			expect(variables.length).toBe(initialVariablesCount + 3);
			expect(variables[initialVariablesCount].getName()).toBe(
				"_GeneratedMemo_0",
			);
			expect(variables[initialVariablesCount + 1].getName()).toBe(
				"_GeneratedMemo_1",
			);
			expect(variables[initialVariablesCount + 2].getName()).toBe(
				"_GeneratedMemo_2",
			);
		});

		it("compiles multiple timers in single expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/1s ET T2/M1/2s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.timers).toHaveLength(2);
			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
		});

		it("avoids name collisions with existing variables", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/1s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();
			variables.push(
				new PLCVariable("memo1", "_GeneratedMemo_0", "memory", "boolean"),
			);
			const initialCount = variables.length;

			TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			// Should skip _GeneratedMemo_0 and start from _GeneratedMemo_1
			expect(variables.length).toBe(initialCount + 3);
			expect(variables[initialCount].getName()).toBe("_GeneratedMemo_1");
		});

		it("simplifies the AST", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI ET VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.FR,
			);

			// "VRAI ET VRAI" should be simplified to "VRAI"
			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			if (result.node.type === "BOOLEAN_LITERAL") {
				expect(result.node.value).toBe(true);
			}
		});

		it("works with English dialect", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = TRUE")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(
				transition,
				grafcet,
				variables,
				Dialect.EN,
			);

			expect(result.node).toBeDefined();
			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
		});
	});

	describe("topology", () => {
		it("resolves predecessor and successor steps for a simple step→transition→step chain", () => {
			const step0 = new StepBuilder()
				.id("step-0")
				.number(0)
				.initial(true)
				.build();
			const trans1 = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addTransition(trans1)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-1", "target:predecessor")
						.build(),
				)
				.build();

			const result = TransitionPreCompiler.preCompile(
				trans1,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.predecessorStepsIds).toEqual(["step-0"]);
			expect(result.successorStepsIds).toEqual(["step-1"]);
			expect(result.orPriorityExclusionTransitionIds).toEqual([]);
		});

		it("resolves multiple predecessor steps through an AND convergence (junction-and-end)", () => {
			const step0 = new StepBuilder()
				.id("step-0")
				.number(0)
				.initial(true)
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const jAndEnd = new JunctionAndEndBuilder().id("jae-1").build();
			const trans1 = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addStep(step2)
				.addJunctionAndEnd(jAndEnd)
				.addTransition(trans1)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("junction-and-end", "jae-1", "target")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-1", "source:successor")
						.target("junction-and-end", "jae-1", "target")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("junction-and-end", "jae-1", "pivot")
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

			const result = TransitionPreCompiler.preCompile(
				trans1,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.predecessorStepsIds).toHaveLength(2);
			expect(result.predecessorStepsIds).toContain("step-0");
			expect(result.predecessorStepsIds).toContain("step-1");
			expect(result.successorStepsIds).toEqual(["step-2"]);
			expect(result.orPriorityExclusionTransitionIds).toEqual([]);
		});

		it("resolves multiple successor steps through an AND divergence (junction-and-start)", () => {
			const step0 = new StepBuilder()
				.id("step-0")
				.number(0)
				.initial(true)
				.build();
			const trans1 = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const jAndStart = new JunctionAndStartBuilder()
				.id("jas-1")
				.nBranches(2)
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const [branch0Id, branch1Id] = jAndStart.data.branchesOrder;
			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addStep(step2)
				.addJunctionAndStart(jAndStart)
				.addTransition(trans1)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("junction-and-start", "jas-1", "pivot")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("junction-and-start", "jas-1", branch0Id)
						.target("step", "step-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("junction-and-start", "jas-1", branch1Id)
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const result = TransitionPreCompiler.preCompile(
				trans1,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.predecessorStepsIds).toEqual(["step-0"]);
			expect(result.successorStepsIds).toHaveLength(2);
			expect(result.successorStepsIds).toContain("step-1");
			expect(result.successorStepsIds).toContain("step-2");
			expect(result.orPriorityExclusionTransitionIds).toEqual([]);
		});

		it("computes orPriorityExclusionTransitionIds: first branch has none, second branch excludes first", () => {
			const step0 = new StepBuilder()
				.id("step-0")
				.number(0)
				.initial(true)
				.build();
			const jOrStart = new JunctionOrStartBuilder()
				.id("jos-1")
				.nBranches(2)
				.build();
			const trans1 = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const trans2 = new TransitionBuilder()
				.id("trans-2")
				.expression("VRAI")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const [branch0Id, branch1Id] = jOrStart.data.branchesOrder;
			const grafcet = new GrafcetBuilder()
				.addStep(step0)
				.addStep(step1)
				.addStep(step2)
				.addJunctionOrStart(jOrStart)
				.addTransition(trans1)
				.addTransition(trans2)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-0", "source:successor")
						.target("junction-or-start", "jos-1", "pivot")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("junction-or-start", "jos-1", branch0Id)
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("junction-or-start", "jos-1", branch1Id)
						.target("transition", "trans-2", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-2", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const result1 = TransitionPreCompiler.preCompile(
				trans1,
				grafcet,
				variables,
				Dialect.FR,
			);
			const result2 = TransitionPreCompiler.preCompile(
				trans2,
				grafcet,
				variables,
				Dialect.FR,
			);

			// First branch: no exclusions
			expect(result1.orPriorityExclusionTransitionIds).toEqual([]);
			// Second branch: must exclude first branch transition
			expect(result2.orPriorityExclusionTransitionIds).toEqual(["trans-1"]);
		});

		it("has empty predecessorStepsIds and successorStepsIds when transition is not connected", () => {
			const trans1 = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(trans1).build();

			const result = TransitionPreCompiler.preCompile(
				trans1,
				grafcet,
				variables,
				Dialect.FR,
			);

			expect(result.predecessorStepsIds).toEqual([]);
			expect(result.successorStepsIds).toEqual([]);
			expect(result.orPriorityExclusionTransitionIds).toEqual([]);
		});
	});
});
