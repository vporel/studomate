import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import GrafcetCompiler from "./grafcet.compiler";

describe("GrafcetCompiler", () => {
	describe("compile", () => {
		it("compiles a simple grafcet with 2 steps and 1 transition", () => {
			const step0Node = IdentifiersBuilder.buildIdentifierNode("X0");
			const step1Node = IdentifiersBuilder.buildIdentifierNode("X1");
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);

			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					["step-0", { node: step0Node, initial: true }],
					["step-1", { node: step1Node, initial: false }],
				]),
				stepsMemos: new Map([
					[
						"step-0",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_1"),
						},
					],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: transitionNode,
							pureNode: transitionNode,
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

		it("garde l'activation de l'étape initiale hors des nodes (X0 := TRUE)", () => {
			const step0Node = IdentifiersBuilder.buildIdentifierNode("X0");
			const step1Node = IdentifiersBuilder.buildIdentifierNode("X1");

			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					["step-0", { node: step0Node, initial: true }],
					["step-1", { node: step1Node, initial: false }],
				]),
				stepsMemos: new Map([
					[
						"step-0",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_1"),
						},
					],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							pureNode: LiteralsBuilder.buildBooleanNode(true),
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

			// La désactivation de X0 par le franchissement de trans-1 reste dans `nodes` — seule
			// l'activation initiale (X0 := TRUE), portée par `buildInitializationNodes`, en est absente.
			const nodesAssigns = result.nodes.flatMap((n) =>
				new FinderVisitor<AssignStatementNode>("ASSIGN_STATEMENT").visit(n),
			);
			expect(
				nodesAssigns.some(
					(n) =>
						(n.left as any).value === "X0" && (n.right as any).value === true,
				),
			).toBe(false);
		});

		it("does not memorize step values in nodes anymore (moved to a separate routine by ProjectCompiler)", () => {
			const step0Node = IdentifiersBuilder.buildIdentifierNode("X0");
			const step1Node = IdentifiersBuilder.buildIdentifierNode("X1");

			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					["step-0", { node: step0Node, initial: true }],
					["step-1", { node: step1Node, initial: false }],
				]),
				stepsMemos: new Map([
					[
						"step-0",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_1"),
						},
					],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							pureNode: LiteralsBuilder.buildBooleanNode(true),
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

			const assignsToMemo = result.nodes
				.flatMap((n) =>
					new FinderVisitor<AssignStatementNode>("ASSIGN_STATEMENT").visit(n),
				)
				.filter((n) => (n.left as any).value?.startsWith("_memo_"));
			expect(assignsToMemo).toEqual([]);
		});

		it("includes timers from transitions", () => {
			const timer1 = { type: "TIMER_BLOCK", timerType: "TON" } as any;

			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-0",
						{
							node: IdentifiersBuilder.buildIdentifierNode("X0"),
							initial: true,
						},
					],
					[
						"step-1",
						{
							node: IdentifiersBuilder.buildIdentifierNode("X1"),
							initial: false,
						},
					],
				]),
				stepsMemos: new Map([
					[
						"step-0",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: {} as any,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_1"),
						},
					],
				]),
				transitions: new Map([
					[
						"trans-1",
						{
							node: LiteralsBuilder.buildBooleanNode(true),
							pureNode: LiteralsBuilder.buildBooleanNode(true),
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
			// La tempo brute est évaluée une seule fois par cycle, en tête de routine,
			// avant toute logique de transition.
			expect(result.nodes[0]).toBe(timer1);
		});

	});

	describe("buildInitializationNodes", () => {
		function grafcetWith(
			steps: [string, { node: any; initial: boolean }][],
		): PreCompiledGrafcet {
			return {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map(steps),
				stepsMemos: new Map(),
				transitions: new Map(),
				actions: new Map(),
			};
		}

		it("émet l'activation de l'étape initiale (X0 := TRUE) sous garde « aucune autre étape active »", () => {
			const nodes = GrafcetCompiler.buildInitializationNodes(
				grafcetWith([
					["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: true }],
					["step-1", { node: IdentifiersBuilder.buildIdentifierNode("X1"), initial: false }],
				]),
			);

			const assigns = nodes.flatMap((n) =>
				new FinderVisitor<AssignStatementNode>("ASSIGN_STATEMENT").visit(n),
			);
			expect(
				assigns.some(
					(n) =>
						(n.left as any).value === "X0" && (n.right as any).value === true,
				),
			).toBe(true);
		});

		it("lève si aucune étape initiale", () => {
			expect(() =>
				GrafcetCompiler.buildInitializationNodes(
					grafcetWith([
						["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: false }],
						["step-1", { node: IdentifiersBuilder.buildIdentifierNode("X1"), initial: false }],
					]),
				),
			).toThrow("Grafcet must have exactly one initial step");
		});

		it("lève si moins de 2 étapes", () => {
			expect(() =>
				GrafcetCompiler.buildInitializationNodes(
					grafcetWith([
						["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: true }],
					]),
				),
			).toThrow("Grafcet must have at least 2 steps");
		});
	});
});
