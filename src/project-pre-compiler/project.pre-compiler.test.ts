import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { Language } from "@/simulator/compiler/lexer/language.enum";
import ProjectPreCompiler from "./project.pre-compiler";

describe("ProjectPreCompiler", () => {
	describe("preCompile", () => {
		it("compiles an empty project", () => {
			const project = new ProjectBuilder().build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			expect(result.result!.variables).toEqual([]);
			expect(result.result!.grafcets).toEqual({});
		});

		it("compiles project variables", () => {
			const var1 = new VariableBuilder()
				.id("v1")
				.mnemonic("E1")
				.type("BOOL")
				.zone("logic-input")
				.build();
			const var2 = new VariableBuilder().id("v2").mnemonic("M1").type("INT").zone("memory").build();
			const project = new ProjectBuilder().addVariable(var1).addVariable(var2).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

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

			const result = ProjectPreCompiler.preCompile(project, [stepVar], Language.FR);

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
			const stepVar = new VariableBuilder().id("v2").mnemonic("X1").type("BOOL").zone("memory").build();
			const project = new ProjectBuilder().addVariable(projectVar).build();

			const result = ProjectPreCompiler.preCompile(project, [stepVar], Language.FR);

			expect(result.errors).toEqual([]);
			expect(result.result!.variables).toHaveLength(2);
		expect(result.result!.variables.map((v) => v.getName())).toContain("M1");
		expect(result.result!.variables.map((v) => v.getName())).toContain("X1");
		});

		it("compiles a grafcet", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(true).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

			expect(result.errors).toEqual([]);
			expect(result.result!.grafcets).toHaveProperty("grafcet-1");
			expect(result.result!.grafcets["grafcet-1"].steps.size).toBe(1);
		});

		it("compiles multiple grafcets", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet1 = new GrafcetBuilder().id("grafcet-1").addStep(step1).build();
			const grafcet2 = new GrafcetBuilder().id("grafcet-2").addStep(step2).build();
			const project = new ProjectBuilder().addGrafcet(grafcet1).addGrafcet(grafcet2).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

			expect(result.errors).toEqual([]);
			expect(Object.keys(result.result!.grafcets)).toHaveLength(2);
			expect(result.result!.grafcets["grafcet-1"]).toBeDefined();
			expect(result.result!.grafcets["grafcet-2"]).toBeDefined();
		});

		it("adds step memo variables to the global variables list", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

			expect(result.errors).toEqual([]);
			// Should have 1 memo variable (one for the step)
			expect(result.result!.variables).toHaveLength(1);
			expect(result.result!.variables[0].getName()).toBe("_GeneratedMemo_0");
		});

		it("ensures memo variables from different grafcets have unique names", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet1 = new GrafcetBuilder().id("grafcet-1").addStep(step1).build();
			const grafcet2 = new GrafcetBuilder().id("grafcet-2").addStep(step2).build();
			const project = new ProjectBuilder().addGrafcet(grafcet1).addGrafcet(grafcet2).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

			expect(result.errors).toEqual([]);
			// Should have 2 memo variables
			expect(result.result!.variables).toHaveLength(2);
			expect(result.result!.variables[0].getName()).toBe("_GeneratedMemo_0");
			expect(result.result!.variables[1].getName()).toBe("_GeneratedMemo_1");
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

			const result = ProjectPreCompiler.preCompile(project, [], Language.FR);

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
			const stepVar = new VariableBuilder().id("v2").mnemonic("X1").type("BOOL").zone("memory").build();
			const step1 = new StepBuilder().id("step-1").number(1).initial(true).build();
			const transition = new TransitionBuilder().id("trans-1").expression("M1 = VRAI").build();
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
			const project = new ProjectBuilder().addVariable(projectVar).addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [stepVar], Language.FR);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
			// project var + step var + 2 memo vars (one per step)
			expect(result.result!.variables.length).toBeGreaterThanOrEqual(3);
			expect(result.result!.grafcets["grafcet-1"].steps.size).toBe(2);
			expect(result.result!.grafcets["grafcet-1"].transitions.size).toBe(1);
			expect(result.result!.grafcets["grafcet-1"].actions.size).toBe(1);
		});

		it("works with English language", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const transition = new TransitionBuilder().id("trans-1").expression("TRUE").build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addTransition(transition)
				.build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, [], Language.EN);

			expect(result.errors).toEqual([]);
			expect(result.result!.grafcets["grafcet-1"].transitions.size).toBe(1);
		});

		it("defaults to French language when not specified", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();
			const project = new ProjectBuilder().addGrafcet(grafcet).build();

			const result = ProjectPreCompiler.preCompile(project, []);

			expect(result.errors).toEqual([]);
			expect(result.result).toBeDefined();
		});
	});
});
