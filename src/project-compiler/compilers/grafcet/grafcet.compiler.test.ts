import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
import GrafcetCompiler from "./grafcet.compiler";

describe("GrafcetCompiler", () => {
	describe("compile", () => {
		it("compiles a simple grafcet with 2 steps and 1 transition", () => {
			const step0Node = IdentifiersBuilder.buildIdentifierNode("X0");
			const step1Node = IdentifiersBuilder.buildIdentifierNode("X1");
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					["step-0", { node: step0Node, initial: true }],
					["step-1", { node: step1Node, initial: false }],
				]),
				stepsMemos: new Map([
					["step-0", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
					["step-1", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") }],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: transitionNode,
							timers: [],
							predecessorStepsIds: ["step-0"],
							successorStepsIds: ["step-1"],
							orPriorityExclusionTransitionIds: [],
						},
					],
				]),
				actions: new Map(),
			};

			const result = GrafcetCompiler.compile(preCompiledGrafcet);

			expect(result).toBeDefined();
			expect(result.nodes).toBeDefined();
			expect(result.timers).toEqual([]);
			expect(result.nodes.length).toBeGreaterThan(0);
		});

		it("includes timers from transitions", () => {
			const timer1 = { type: "TIMER_BLOCK", timerType: "TON" } as any;

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: true }],
					["step-1", { node: IdentifiersBuilder.buildIdentifierNode("X1"), initial: false }],
				]),
				stepsMemos: new Map([
					["step-0", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
					["step-1", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") }],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							timers: [timer1],
							predecessorStepsIds: ["step-0"],
							successorStepsIds: ["step-1"],
							orPriorityExclusionTransitionIds: [],
						},
					],
				]),
				actions: new Map(),
			};

			const result = GrafcetCompiler.compile(preCompiledGrafcet);

			expect(result.timers).toHaveLength(1);
			expect(result.timers[0]).toBe(timer1);
		});

		it("throws error if no initial step", () => {
			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: false }],
					["step-1", { node: IdentifiersBuilder.buildIdentifierNode("X1"), initial: false }],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							timers: [],
							predecessorStepsIds: ["step-0"],
							successorStepsIds: ["step-1"],
							orPriorityExclusionTransitionIds: [],
						},
					],
				]),
				actions: new Map(),
			stepsMemos: new Map([
				["step-0", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
				["step-1", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") }],
			]),
			};

			expect(() => GrafcetCompiler.compile(preCompiledGrafcet)).toThrow(
				"Grafcet must have exactly one initial step",
			);
		});

		it("throws error if less than 2 steps", () => {
			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: true }],
				]),
				stepsMemos: new Map([
					["step-0", { variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							timers: [],
							predecessorStepsIds: ["step-0"],
							successorStepsIds: [],
							orPriorityExclusionTransitionIds: [],
						},
					],
				]),
				actions: new Map(),
			};

			expect(() => GrafcetCompiler.compile(preCompiledGrafcet)).toThrow(
				"Grafcet must have at least 2 steps",
			);
		});
	});
});
