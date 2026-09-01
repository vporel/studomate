import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { PreCompiledProgram } from "./pre-compiled-program";
import { isPreCompiledGrafcet } from "./pre-compilers/grafcet/grafcet.pre-compiler";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectPreCompiler from "./project.pre-compiler";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";

/** Rétrécit un programme pré-compilé vers sa forme GRAFCET, en échouant clairement sinon */
function asGrafcet(program: PreCompiledProgram) {
	if (!isPreCompiledGrafcet(program))
		throw new Error(`Programme non GRAFCET : ${program?.type}`);
	return program;
}

describe("ProjectPreCompiler", () => {
	describe("preCompile", () => {
		it("compiles an empty project", () => {
			const project = new ProjectBuilder().build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			expect(result.result!.variables).toEqual([]);
			// Un projet porte toujours un Main (voir Project.createMain) — seul programme ici.
			expect(Object.values(result.result!.programs)).toHaveLength(1);
			expect(Object.values(result.result!.programs)[0]).toMatchObject({
				type: "ladder",
				role: "main",
			});
		});

		it("compiles project variables", () => {
			const var1 = new VariableBuilder()
				.id("v1")
				.mnemonic("E1")
				.type("BOOL")
				.zone("logic-input")
				.build();
			const var2 = new VariableBuilder()
				.id("v2")
				.mnemonic("M1")
				.type("INT")
				.zone("memory")
				.build();
			const project = new ProjectBuilder()
				.addVariable(var1)
				.addVariable(var2)
				.build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			expect(result.result!.variables).toHaveLength(2);
			expect(result.result!.variables[0].getName()).toBe("E1");
			expect(result.result!.variables[1].getName()).toBe("M1");
		});

		it("compiles step variables", () => {
			const stepVar = new VariableBuilder()
				.id("step-var-1")
				.mnemonic("X1")
				.type("BOOL")
				.zone("memory")
				.build();
			const project = new ProjectBuilder().build();

			const result = ProjectPreCompiler.preCompile(
				project,
				[stepVar],
				Dialect.FR,
			);

			expect(result.errors).toEqual([]);
			expect(result.result!.variables).toHaveLength(1);
			expect(result.result!.variables[0].getName()).toBe("X1");
		});

		it("merges project variables and step variables", () => {
			const projectVar = new VariableBuilder()
				.id("v1")
				.mnemonic("M1")
				.type("BOOL")
				.zone("memory")
				.build();
			const stepVar = new VariableBuilder()
				.id("v2")
				.mnemonic("X1")
				.type("BOOL")
				.zone("memory")
				.build();
			const project = new ProjectBuilder().addVariable(projectVar).build();

			const result = ProjectPreCompiler.preCompile(
				project,
				[stepVar],
				Dialect.FR,
			);

			expect(result.errors).toEqual([]);
			expect(result.result!.variables).toHaveLength(2);
			expect(result.result!.variables.map((v) => v.getName())).toContain("M1");
			expect(result.result!.variables.map((v) => v.getName())).toContain("X1");
		});

		it("compiles a grafcet", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			expect(result.result!.programs).toHaveProperty("grafcet-1");
			expect(asGrafcet(result.result!.programs["grafcet-1"]).steps.size).toBe(
				1,
			);
		});

		it("compiles multiple grafcets", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet1 = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.build();
			const grafcet2 = new GrafcetBuilder()
				.id("grafcet-2")
				.addStep(step2)
				.build();
			const project = new ProjectBuilder()
				.addGrafcet(grafcet1)
				.addGrafcet(grafcet2)
				.build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			// +1 pour le Main, toujours présent (voir Project.createMain).
			expect(Object.keys(result.result!.programs)).toHaveLength(3);
			expect(result.result!.programs["grafcet-1"]).toBeDefined();
			expect(result.result!.programs["grafcet-2"]).toBeDefined();
		});

		it("adds step memo variables to the global variables list", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			// Should have 1 memo variable (one for the step)
			expect(result.result!.variables).toHaveLength(1);
			expect(result.result!.variables[0].getName()).toBe("_GeneratedMemo_0");
		});

		it("ensures memo variables from different grafcets have unique names", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet1 = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.build();
			const grafcet2 = new GrafcetBuilder()
				.id("grafcet-2")
				.addStep(step2)
				.build();
			const project = new ProjectBuilder()
				.addGrafcet(grafcet1)
				.addGrafcet(grafcet2)
				.build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors).toEqual([]);
			// Should have 2 memo variables
			expect(result.result!.variables).toHaveLength(2);
			expect(result.result!.variables[0].getName()).toBe("_GeneratedMemo_0");
			expect(result.result!.variables[1].getName()).toBe("_GeneratedMemo_1");
		});

		it("rebinds a receptivity's reference to another grafcet's step to that step's memo", () => {
			const g1 = GrafcetFactory.createSimpleCycle("g1", "VRAI", "VRAI", 0); // steps X0, X1
			// La réceptivité de trans-0 référence directement l'étape X1 de g1.
			const g2 = GrafcetFactory.createSimpleCycle("g2", "X1", "VRAI", 10); // steps X10, X11
			const project = ProjectFactory.create([], [g1, g2]);
			const generatedVariables = ProjectAnalyser.analyse(project).generatedVariables;

			const result = ProjectPreCompiler.preCompile(
				project,
				generatedVariables,
				Dialect.FR,
			);

			expect(result.errors).toEqual([]);
			const grafcet1 = asGrafcet(result.result!.programs["g1"]);
			const grafcet2 = asGrafcet(result.result!.programs["g2"]);
			const step1Id = Array.from(grafcet1.steps.entries()).find(
				([, step]) => step.node.value === "X1",
			)![0];
			const memoNameForX1 = grafcet1.stepsMemos.get(step1Id)!.variable.getName();

			const trans0Node = Array.from(grafcet2.transitions.values())[0].node;
			const identifiers = new FinderVisitor<IdentifierNode>("IDENTIFIER").visit(
				trans0Node,
			);
			expect(identifiers.map((n) => n.value)).toContain(memoNameForX1);
			expect(identifiers.map((n) => n.value)).not.toContain("X1");
		});

		it("also rebinds a receptivity referencing a non-predecessor step of its own grafcet", () => {
			const g1 = new GrafcetBuilder()
				.id("g1")
				.addStep(new StepBuilder().id("s0").number(0).initial().build())
				.addStep(new StepBuilder().id("s1").number(1).build())
				.addStep(new StepBuilder().id("s2").number(2).build())
				.addTransition(
					// Réceptivité du s0→s1 référençant l'étape non-prédécesseur X2.
					new TransitionBuilder().id("t0").expression("X2").build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "s0", "source:successor")
						.target("transition", "t0", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "t0", "source:successor")
						.target("step", "s1", "target:predecessor")
						.build(),
				)
				.build();
			const project = new ProjectBuilder().addGrafcet(g1).build();
			const generatedVariables = ProjectAnalyser.analyse(project).generatedVariables;

			const result = ProjectPreCompiler.preCompile(
				project,
				generatedVariables,
				Dialect.FR,
			);

			expect(result.errors).toEqual([]);
			const grafcet = asGrafcet(result.result!.programs["g1"]);
			const step2Id = Array.from(grafcet.steps.entries()).find(
				([, step]) => step.node.value === "X2",
			)![0];
			const memoNameForX2 = grafcet.stepsMemos.get(step2Id)!.variable.getName();

			const t0Node = grafcet.transitions.get("t0")!.node;
			const identifiers = new FinderVisitor<IdentifierNode>("IDENTIFIER").visit(t0Node);
			expect(identifiers.map((n) => n.value)).toEqual([memoNameForX2]);
		});

		it("collects compilation errors", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("((") // Parenthèses non fermées - syntaxe invalide
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addTransition(transition)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.FR);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.result).toBeDefined(); // Result is still provided even with errors
		});

		it("compiles full project with all element types", () => {
			const projectVar = new VariableBuilder()
				.id("v1")
				.mnemonic("M1")
				.type("BOOL")
				.zone("memory")
				.build();
			const stepVar = new VariableBuilder()
				.id("v2")
				.mnemonic("X1")
				.type("BOOL")
				.zone("memory")
				.build();
			const step1 = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("M1 = VRAI")
				.build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const action = new ActionBuilder()
				.id("action-1")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("M1")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStep(step2)
				.addTransition(transition)
				.addAction(action)
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
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-2", "source:action")
						.target("action", "action-1", "target:step")
						.build(),
				)
				.build();
			const project = new ProjectBuilder()
				.addVariable(projectVar)
				.addGrafcet(grafcet)
				.build();

			const result = ProjectPreCompiler.preCompile(
				project,
				[stepVar],
				Dialect.FR,
			);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			// project var + step var + 2 memo vars (one per step)
			expect(result.result!.variables.length).toBeGreaterThanOrEqual(3);
			expect(asGrafcet(result.result!.programs["grafcet-1"]).steps.size).toBe(
				2,
			);
			expect(
				asGrafcet(result.result!.programs["grafcet-1"]).transitions.size,
			).toBe(1);
			expect(asGrafcet(result.result!.programs["grafcet-1"]).actions.size).toBe(
				1,
			);
		});

		it("works with English dialect", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("TRUE")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addTransition(transition)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Dialect.EN);

			expect(result.errors).toEqual([]);
			expect(
				asGrafcet(result.result!.programs["grafcet-1"]).transitions.size,
			).toBe(1);
		});

		it("defaults to French dialect when not specified", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, []);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
		});
	});
});
