import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import ProjectCompiler from "./project.compiler";

describe("ProjectCompiler", () => {
	describe("compile", () => {
		it("compiles an empty project", () => {
			const preCompiledProject: PreCompiledProject = {
				variables: [],
				programs: {},
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			expect(result.result!.variables).toEqual([]);
			expect(result.result!.routines).toEqual([]);
			expect(result.result!.timers).toEqual([]);
		});

		it("compiles project variables", () => {
			const var1 = new PLCVariable("var-1", "M1", "memory", "boolean");
			const var2 = new PLCVariable("var-2", "E1", "input", "boolean");

			const preCompiledProject: PreCompiledProject = {
				variables: [var1, var2],
				programs: {},
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors).toEqual([]);
			expect(result.result!.variables).toHaveLength(2);
			expect(result.result!.variables[0]).toBe(var1);
			expect(result.result!.variables[1]).toBe(var2);
		});

		it("compiles a single grafcet", () => {
			const var1 = new PLCVariable("var-1", "X0", "memory", "boolean");
			const var2 = new PLCVariable("var-2", "X1", "memory", "boolean");
			const memo0 = new PLCVariable("memo-0", "_memo_0", "memory", "boolean");
			const memo1 = new PLCVariable("memo-1", "_memo_1", "memory", "boolean");
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
							variable: memo0,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: memo1,
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

			const preCompiledProject: PreCompiledProject = {
				variables: [var1, var2, memo0, memo1],
				programs: {
					"grafcet-1": preCompiledGrafcet,
				},
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			// 1 routine de grafcet + la routine des mémos d'étape + la routine d'initialisation.
			expect(result.result!.routines).toHaveLength(3);
			expect(result.result!.routines[0].getNodes().length).toBeGreaterThan(0);
		});

		it("ajoute une routine d'observation en dernier et remplit l'index des réceptivités", () => {
			const obsVar = new PLCVariable(
				"obs-1",
				"_GeneratedMemo_9",
				"memory",
				"boolean",
			);
			const x0 = new PLCVariable("var-1", "X0", "memory", "boolean");
			const x1 = new PLCVariable("var-2", "X1", "memory", "boolean");
			const memo0 = new PLCVariable("memo-0", "_memo_0", "memory", "boolean");
			const memo1 = new PLCVariable("memo-1", "_memo_1", "memory", "boolean");
			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
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
							variable: memo0,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: memo1,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_1"),
						},
					],
				]),
				transitions: new Map(),
				actions: new Map(),
				transitionObservations: new Map([
					[
						"trans-1",
						{
							variable: obsVar,
							node: IdentifiersBuilder.buildIdentifierNode("X0"),
						},
					],
				]),
			};
			const preCompiledProject: PreCompiledProject = {
				variables: [x0, x1, memo0, memo1, obsVar],
				programs: { "grafcet-1": preCompiledGrafcet },
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors).toEqual([]);
			expect(result.result!.evaluableExpressionVariableIds).toEqual({
				"trans-1": "obs-1",
			});
			const observationRoutine =
				result.result!.routines[result.result!.routines.length - 1];
			expect(observationRoutine.getNodes()).toHaveLength(1);
			expect(observationRoutine.getNodes()[0].type).toBe("ASSIGN_STATEMENT");
		});

		it("n'ajoute pas de routine d'observation quand aucune transition n'est observable", () => {
			const result = ProjectCompiler.compile({ variables: [], programs: {} });
			expect(result.result!.routines).toEqual([]);
			expect(result.result!.evaluableExpressionVariableIds).toEqual({});
		});

		it("performs semantic analysis on routines", () => {
			const var1 = new PLCVariable("var-1", "X0", "memory", "boolean");
			const var2 = new PLCVariable("var-2", "X1", "memory", "boolean");
			const memo0 = new PLCVariable("memo-0", "_memo_0", "memory", "boolean");
			const memo1 = new PLCVariable("memo-1", "_memo_1", "memory", "boolean");
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
							variable: memo0,
							node: IdentifiersBuilder.buildIdentifierNode("_memo_0"),
						},
					],
					[
						"step-1",
						{
							variable: memo1,
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

			const preCompiledProject: PreCompiledProject = {
				variables: [var1, var2, memo0, memo1],
				programs: {
					"grafcet-1": preCompiledGrafcet,
				},
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
		});

		it("handles compilation errors gracefully", () => {
			const var1 = new PLCVariable("var-1", "X0", "memory", "boolean");

			// Neither step is initial → initializeSteps throws, which is caught as a compilation error
			const preCompiledGrafcet: PreCompiledGrafcet = {
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-0",
						{
							node: IdentifiersBuilder.buildIdentifierNode("X0"),
							initial: false,
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
				transitions: new Map(),
				actions: new Map(),
			};

			const preCompiledProject: PreCompiledProject = {
				variables: [var1],
				programs: {
					"grafcet-1": preCompiledGrafcet,
				},
			};

			const result = ProjectCompiler.compile(preCompiledProject);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.result).toBeUndefined();
		});
	});
});
