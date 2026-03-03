import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import GrafcetAnalyser, { getStepVariableId, getStepVariableMnemonic } from "./grafcet.analyser";

describe("GrafcetAnalyser", () => {
	describe("getStepVariableId", () => {
		it("generates step variable ID", () => {
			const id = getStepVariableId("grafcet-1", 5);
			expect(id).toBe("grafcet-grafcet-1-step-5");
		});

		it("handles different grafcet IDs", () => {
			const id1 = getStepVariableId("grafcet-abc", 10);
			const id2 = getStepVariableId("grafcet-xyz", 10);
			expect(id1).not.toBe(id2);
		});
	});

	describe("getStepVariableMnemonic", () => {
		it("generates X mnemonic", () => {
			expect(getStepVariableMnemonic(1)).toBe("X1");
			expect(getStepVariableMnemonic(10)).toBe("X10");
			expect(getStepVariableMnemonic(100)).toBe("X100");
		});

		it("handles zero", () => {
			expect(getStepVariableMnemonic(0)).toBe("X0");
		});
	});

	describe("analyse", () => {
		it("returns no issues for valid grafcet with initial step", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const errors = result.issues.filter((i) => i.severity === "error");
			// Step will have errors about no predecessor/successor, but no grafcet-level errors
			const grafcetErrors = errors.filter((i) => i.source.sourceType === "grafcet");
			expect(grafcetErrors).toHaveLength(0);
		});

		it("detects missing initial step", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(false).position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const initialStepError = result.issues.find(
				(issue) => issue.source.sourceType === "grafcet" && issue.message.includes("étape initiale"),
			);
			expect(initialStepError).toBeDefined();
			expect(initialStepError?.severity).toBe("error");
		});

		it("generates step variables for valid step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(10).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toHaveLength(3);
			expect(result.stepsVariables[0].mnemonic).toBe("X1");
			expect(result.stepsVariables[1].mnemonic).toBe("X2");
			expect(result.stepsVariables[2].mnemonic).toBe("X10");

			result.stepsVariables.forEach((v) => {
				expect(v.zone).toBe("memory");
				expect(v.type).toBe("BOOL");
				expect(v.getNativeType()).toBe("boolean");
			});
		});

		it("skips step variables for invalid step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number("").initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(-5).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(1.5).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toHaveLength(0);
		});

		it("deduplicates step variables by number", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(1).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(1).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			// Only one X1 variable despite 3 steps with number 1
			expect(result.stepsVariables).toHaveLength(1);
			expect(result.stepsVariables[0].mnemonic).toBe("X1");
		});

		it("attaches parent ID to all element issues", () => {
			const step = new StepBuilder().id("step-1").number("").initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const elementIssues = result.issues.filter((i) => i.source.sourceType !== "grafcet");
			expect(elementIssues.length).toBeGreaterThan(0);
			elementIssues.forEach((issue) => {
				expect(issue.source.parentId).toBe("grafcet-1");
			});
		});

		it("analyses all element types in grafcet", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const transition = new TransitionBuilder().id("trans-1").expression("").position(0, 50).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addStep(step)
				.addTransition(transition)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			// Should have issues from both step and transition
			const stepIssues = result.issues.filter((i) => i.source.sourceType === "grafcet-step");
			const transitionIssues = result.issues.filter(
				(i) => i.source.sourceType === "grafcet-transition",
			);

			expect(stepIssues.length).toBeGreaterThan(0);
			expect(transitionIssues.length).toBeGreaterThan(0);
		});

		it("passes project variables to analysers", () => {
			const projectVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("MyVar")
				.zone("logic-input")
				.type("BOOL")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step1, step2).build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test")
				.author("Author")
				.addVariable(projectVar)
				.build();
			// This should not throw - analysers receive both project vars and step vars
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result).toBeDefined();
		});

		it("handles empty grafcet", () => {
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toEqual([]);
			// Should have error about missing initial step
			const initialStepError = result.issues.find((i) => i.message.includes("étape initiale"));
			expect(initialStepError).toBeDefined();
		});
	});
});
