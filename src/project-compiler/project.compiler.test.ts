import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
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
					["step-0", { variable: memo0, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
					["step-1", { variable: memo1, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") }],
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
			expect(result.result!.routines).toHaveLength(1);
			expect(result.result!.routines[0].getNodes().length).toBeGreaterThan(0);
		});

		it("performs semantic analysis on routines", () => {
			const var1 = new PLCVariable("var-1", "X0", "memory", "boolean");
			const var2 = new PLCVariable("var-2", "X1", "memory", "boolean");
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
						{ variable: memo0, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") },
					],
					[
						"step-1",
						{ variable: memo1, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") },
					],
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
						{ variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") },
					],
					[
						"step-1",
						{ variable: {} as any, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") },
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
