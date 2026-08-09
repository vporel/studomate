import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import ProjectAnalyser from "./project.analyser";

describe("ProjectAnalyser", () => {
	describe("analyse", () => {
		it("returns empty result for empty project", () => {
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.build();
			const result = ProjectAnalyser.analyse(project);

			expect(result.totalAnalysedElements).toBe(0);
			expect(result.issues).toEqual([]);
			expect(result.stepsVariables).toEqual([]);
		});

		it("reports an issue for a program whose notation has no analyser, instead of failing silently", () => {
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.build();
			// Simule un programme d'une notation future/inconnue (fichier importé, migration
			// incomplète...) : rien ne construit ça normalement via l'API publique.
			project.programs["unknown-1"] = { id: "unknown-1", name: "Mystère", type: "unknown" } as any;

			const result = ProjectAnalyser.analyse(project);

			const missingAnalyserIssue = result.issues.find(
				(issue) => issue.code === "PROJECT_MISSING_ANALYSER_FOR_NOTATION",
			);
			expect(missingAnalyserIssue).toBeDefined();
			expect(missingAnalyserIssue?.severity).toBe("error");
			expect(missingAnalyserIssue?.message).toContain("Mystère");
		});

		it("analyses single grafcet with valid initial step", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test Grafcet").addStep(step).build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcet(grafcet)
				.build();
			const result = ProjectAnalyser.analyse(project);

			expect(result.totalAnalysedElements).toBe(1);
			expect(result.stepsVariables).toHaveLength(1);
			expect(result.stepsVariables[0].mnemonic).toBe("X1");
		});

		it("detects missing initial step in grafcet", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial(false).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).initial(false).position(0, 100).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test Grafcet")
				.addSteps(step1, step2)
				.build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcet(grafcet)
				.build();
			const result = ProjectAnalyser.analyse(project);

			const initialStepError = result.issues.find((issue) => issue.message.includes("étape initiale"));
			expect(initialStepError).toBeDefined();
			expect(initialStepError?.severity).toBe("error");
		});

		it("aggregates issues from multiple grafcets", () => {
			// Grafcet 1: no initial step
			const step1 = new StepBuilder().id("step-1").number(1).initial(false).position(0, 0).build();
			const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("Grafcet 1").addStep(step1).build();

			// Grafcet 2: no initial step
			const step2 = new StepBuilder().id("step-2").number(1).initial(false).position(0, 0).build();
			const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("Grafcet 2").addStep(step2).build();

			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcets(grafcet1, grafcet2)
				.build();
			const result = ProjectAnalyser.analyse(project);

			const initialStepErrors = result.issues.filter((issue) =>
				issue.message.includes("étape initiale"),
			);
			expect(initialStepErrors).toHaveLength(2);
		});

		it("aggregates step variables from multiple grafcets", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet1 = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Grafcet 1")
				.addSteps(step1, step2)
				.build();

			const step3 = new StepBuilder().id("step-3").number(10).initial().position(0, 0).build();
			const step4 = new StepBuilder().id("step-4").number(20).position(0, 100).build();
			const grafcet2 = new GrafcetBuilder()
				.id("grafcet-2")
				.name("Grafcet 2")
				.addSteps(step3, step4)
				.build();

			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcets(grafcet1, grafcet2)
				.build();
			const result = ProjectAnalyser.analyse(project);

			expect(result.stepsVariables).toHaveLength(4);
			const mnemonics = result.stepsVariables.map((v) => v.mnemonic);
			expect(mnemonics).toContain("X1");
			expect(mnemonics).toContain("X2");
			expect(mnemonics).toContain("X10");
			expect(mnemonics).toContain("X20");
		});

		it("counts total analysed elements correctly", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.position(0, 50)
				.build();

			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test Grafcet")
				.addSteps(step1, step2)
				.addTransition(transition)
				.build();

			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcet(grafcet)
				.build();
			const result = ProjectAnalyser.analyse(project);

			expect(result.totalAnalysedElements).toBe(3);
		});

		it("attaches parent ID to all element issues", () => {
			// Step without number
			const step = new StepBuilder().id("step-1").number("").initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test Grafcet").addStep(step).build();

			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addGrafcet(grafcet)
				.build();
			const result = ProjectAnalyser.analyse(project);

			const stepIssues = result.issues.filter((issue) => issue.source.sourceType === "grafcet-step");
			expect(stepIssues.length).toBeGreaterThan(0);
			stepIssues.forEach((issue) => {
				expect(issue.source.parentId).toBe("grafcet-1");
			});
		});

		it("handles project with variables", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("MyVar")
				.zone("logic-input")
				.type("BOOL")
				.build();
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test Grafcet").addStep(step).build();

			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test Project")
				.author("Test Author")
				.addVariable(variable)
				.addGrafcet(grafcet)
				.build();
			const result = ProjectAnalyser.analyse(project);

			// Should not throw, variables are passed to analysers
			expect(result).toBeDefined();
		});

		describe("checkDuplicateStepNumbers", () => {
			it("detects the same step number in two different grafcets", () => {
				const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
				const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("G1").addStep(step1).build();

				const step2 = new StepBuilder().id("step-2").number(1).initial().position(0, 0).build();
				const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("G2").addStep(step2).build();

				const project = new ProjectBuilder()
					.id("project-1")
					.name("Test Project")
					.author("Test Author")
					.addGrafcets(grafcet1, grafcet2)
					.build();
				const result = ProjectAnalyser.analyse(project);

				const dupIssues = result.issues.filter((i) =>
					i.message.includes("unique") && i.message.includes("1"),
				);
				expect(dupIssues).toHaveLength(1);
				expect(dupIssues[0].severity).toBe("error");
				expect(dupIssues[0].source.sourceType).toBe("project");
				expect(dupIssues[0].message).toContain('"G1"');
				expect(dupIssues[0].message).toContain('"G2"');
			});

			it("flags all occurrences when three grafcets share the same step number", () => {
				const step1 = new StepBuilder().id("step-1").number(5).initial().position(0, 0).build();
				const step2 = new StepBuilder().id("step-2").number(5).initial().position(0, 0).build();
				const step3 = new StepBuilder().id("step-3").number(5).initial().position(0, 0).build();
				const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("G1").addStep(step1).build();
				const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("G2").addStep(step2).build();
				const grafcet3 = new GrafcetBuilder().id("grafcet-3").name("G3").addStep(step3).build();

				const project = new ProjectBuilder()
					.id("project-1")
					.name("Test Project")
					.author("Test Author")
					.addGrafcets(grafcet1, grafcet2, grafcet3)
					.build();
				const result = ProjectAnalyser.analyse(project);

				const dupIssues = result.issues.filter((i) => i.message.includes("unique"));
				expect(dupIssues).toHaveLength(1);
				expect(dupIssues[0].message).toContain('"G1"');
				expect(dupIssues[0].message).toContain('"G2"');
				expect(dupIssues[0].message).toContain('"G3"');
			});

			it("does not flag identical step numbers within the same grafcet (already handled by step analyser)", () => {
				const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
				const step2 = new StepBuilder().id("step-2").number(1).position(0, 100).build();
				const grafcet = new GrafcetBuilder()
					.id("grafcet-1")
					.name("G1")
					.addSteps(step1, step2)
					.build();

				const project = new ProjectBuilder()
					.id("project-1")
					.name("Test Project")
					.author("Test Author")
					.addGrafcet(grafcet)
					.build();
				const result = ProjectAnalyser.analyse(project);

				const dupIssues = result.issues.filter((i) => i.message.includes("unique"));
				expect(dupIssues).toHaveLength(0);
			});

			it("does not flag when all step numbers are distinct across grafcets", () => {
				const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
				const step2 = new StepBuilder().id("step-2").number(2).initial().position(0, 0).build();
				const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("G1").addStep(step1).build();
				const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("G2").addStep(step2).build();

				const project = new ProjectBuilder()
					.id("project-1")
					.name("Test Project")
					.author("Test Author")
					.addGrafcets(grafcet1, grafcet2)
					.build();
				const result = ProjectAnalyser.analyse(project);

				const dupIssues = result.issues.filter((i) => i.message.includes("unique"));
				expect(dupIssues).toHaveLength(0);
			});
		});
	});
});
