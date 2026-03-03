import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepAnalyser from "./step.analyser";

describe("StepAnalyser", () => {
	const analyser = new StepAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid step with number", () => {
			const step = new StepBuilder().id("step-1").number(1).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});

		it("detects missing step number", () => {
			const step = new StepBuilder().id("step-1").number("").build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("numéro de l'étape n'est pas défini");
		});

		it("allows empty number when allowEmptyContent is true", () => {
			const step = new StepBuilder().id("step-1").number("").build();

			const issues = analyser.analyseIsolated(step, { allowEmptyContent: true });

			expect(issues).toHaveLength(0);
		});

		it("detects negative step number", () => {
			const step = new StepBuilder().id("step-1").number(-5).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("detects decimal step number", () => {
			const step = new StepBuilder().id("step-1").number(1.5).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("accepts zero as step number", () => {
			const step = new StepBuilder().id("step-1").number(0).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});

		it("accepts large step numbers", () => {
			const step = new StepBuilder().id("step-1").number(9999).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("returns no issues for valid step in complete sequence", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(step1, grafcet, []);

			const noPredecessorIssues = issues.filter((i) => i.message.includes("amont"));
			const noSuccessorIssues = issues.filter((i) => i.message.includes("aval"));
			expect(noPredecessorIssues).toHaveLength(0);
			expect(noSuccessorIssues).toHaveLength(0);
		});

		it("detects duplicate step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number(1).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addSteps(step1, step2).build();

			const issues = analyser.analyseInContext(step1, grafcet, []);

			const duplicateIssue = issues.find((i) => i.message.includes("utilisé par plusieurs"));
			expect(duplicateIssue).toBeDefined();
			expect(duplicateIssue?.severity).toBe("error");
		});

		it("allows same number if one is empty", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number("").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addSteps(step1, step2).build();

			const issues = analyser.analyseInContext(step1, grafcet, []);

			const duplicateIssue = issues.find((i) => i.message.includes("utilisé par plusieurs"));
			expect(duplicateIssue).toBeUndefined();
		});

		it("detects step without predecessor (non-initial)", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(false).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();

			const issues = analyser.analyseInContext(step, grafcet, []);

			const noPredecessorIssue = issues.find((i) => i.message.includes("amont"));
			expect(noPredecessorIssue).toBeDefined();
			expect(noPredecessorIssue?.severity).toBe("error");
		});

		it("allows initial step without predecessor", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).addConnection(c1).build();

			const issues = analyser.analyseInContext(step, grafcet, []);

			const noPredecessorIssue = issues.find((i) => i.message.includes("amont"));
			expect(noPredecessorIssue).toBeUndefined();
		});

		it("detects step without successor", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addStep(step).build();

			const issues = analyser.analyseInContext(step, grafcet, []);

			const noSuccessorIssue = issues.find((i) => i.message.includes("aval"));
			expect(noSuccessorIssue).toBeDefined();
			expect(noSuccessorIssue?.severity).toBe("error");
		});

		it("handles multiple steps with different numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const step3 = new StepBuilder().id("step-3").number(10).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addSteps(step1, step2, step3).build();

			const issues1 = analyser.analyseInContext(step1, grafcet, []);
			const issues2 = analyser.analyseInContext(step2, grafcet, []);
			const issues3 = analyser.analyseInContext(step3, grafcet, []);

			const duplicateIssue1 = issues1.find((i) => i.message.includes("utilisé par plusieurs"));
			const duplicateIssue2 = issues2.find((i) => i.message.includes("utilisé par plusieurs"));
			const duplicateIssue3 = issues3.find((i) => i.message.includes("utilisé par plusieurs"));

			expect(duplicateIssue1).toBeUndefined();
			expect(duplicateIssue2).toBeUndefined();
			expect(duplicateIssue3).toBeUndefined();
		});
	});
});
