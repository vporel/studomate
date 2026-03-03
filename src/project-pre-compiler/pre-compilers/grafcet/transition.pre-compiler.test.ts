import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { Language } from "@/simulator/compiler/lexer/language.enum";
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
			const transition = new TransitionBuilder().id("trans-1").expression("E1 = VRAI").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node).toBeDefined();
			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles expression with VRAI literal", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			expect(result.timers).toEqual([]);
		});

		it("compiles expression with FAUX literal", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("FAUX").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			expect(result.timers).toEqual([]);
		});

		it("compiles AND expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI ET M1 = VRAI")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles OR expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI OU M1 = FAUX")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles numeric comparison", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("M2 > 10").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
			expect(result.timers).toEqual([]);
		});

		it("compiles timer expression and creates timer node", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/E1/5s").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.timers).toHaveLength(1);
			expect(result.timers[0].type).toBe("TIMER_BLOCK");
		});

		it("compiles timer with milliseconds", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/E1/500ms").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.timers).toHaveLength(1);
			expect((result.timers[0].presetTime as any).value).toBe(500);
		});

		it("replaces timer declaration with timer node in AST", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/E1/1s").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			// The node should be a TIMER_BLOCK, not a TIMER_STRING_DECLARATION
			expect(result.node.type).toBe("TIMER_BLOCK");
			expect(result.timers).toHaveLength(1);
		});

		it("generates synthetic memo variables for timers", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/E1/2s").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();
			const initialVariablesCount = variables.length;

			TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			// Each timer requires 3 memo variables: lastInput, elapsedTime, output
			expect(variables.length).toBe(initialVariablesCount + 3);
			expect(variables[initialVariablesCount].getName()).toBe("_GeneratedMemo_0");
			expect(variables[initialVariablesCount + 1].getName()).toBe("_GeneratedMemo_1");
			expect(variables[initialVariablesCount + 2].getName()).toBe("_GeneratedMemo_2");
		});

		it("compiles multiple timers in single expression", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("T1/E1/1s ET T2/M1/2s")
				.build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			expect(result.timers).toHaveLength(2);
			expect(result.node.type).toBe("LOGICAL_EXPRESSION");
		});

		it("avoids name collisions with existing variables", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/E1/1s").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();
			variables.push(new PLCVariable("memo1", "_GeneratedMemo_0", "memory", "boolean"));
			const initialCount = variables.length;

			TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			// Should skip _GeneratedMemo_0 and start from _GeneratedMemo_1
			expect(variables.length).toBe(initialCount + 3);
			expect(variables[initialCount].getName()).toBe("_GeneratedMemo_1");
		});

		it("simplifies the AST", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI ET VRAI").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.FR);

			// "VRAI ET VRAI" should be simplified to "VRAI"
			expect(result.node.type).toBe("BOOLEAN_LITERAL");
			if (result.node.type === "BOOLEAN_LITERAL") {
				expect(result.node.value).toBe(true);
			}
		});

		it("works with English language", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("E1 = TRUE").build();
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			const result = TransitionPreCompiler.preCompile(transition, grafcet, variables, Language.EN);

			expect(result.node).toBeDefined();
			expect(result.node.type).toBe("COMPARISON_EXPRESSION");
		});
	});
});
