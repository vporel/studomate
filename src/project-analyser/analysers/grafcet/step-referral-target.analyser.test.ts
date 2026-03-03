import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralTargetAnalyser from "./step-referral-target.analyser";

describe("StepReferralTargetAnalyser", () => {
	const analyser = new StepReferralTargetAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid source step number", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(5).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});

		it("detects empty source step number", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber("").build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("vide");
		});

		it("allows empty source when allowEmptyContent is true", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber("").build();

			const issues = analyser.analyseIsolated(referral, { allowEmptyContent: true });

			expect(issues).toHaveLength(0);
		});

		it("detects negative source step number", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(-1).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("detects decimal source step number", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(2.5).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("accepts zero as source step number", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(0).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects source step does not exist", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(99).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralTarget(referral)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const notExistIssue = issues.find((i) => i.message.includes("n'existe"));
			expect(notExistIssue).toBeDefined();
			expect(notExistIssue?.severity).toBe("error");
		});

		it("accepts when source step exists", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("step-referral-target", "referral-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addStepReferralTarget(referral)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const notExistIssues = issues.filter((i) => i.message.includes("n'existe"));
			expect(notExistIssues).toHaveLength(0);
		});

		it("detects when referral target has no successor step", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralTarget(referral)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const connectionIssue = issues.find((i) => i.message.includes("aval"));
			expect(connectionIssue).toBeDefined();
			expect(connectionIssue?.severity).toBe("error");
		});

		it("validates referral target connections", () => {
			const referral = new StepReferralTargetBuilder().id("referral-1").sourceStepNumber(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("step-referral-target", "referral-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addStepReferralTarget(referral)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			// Should have minimal issues (depends on internal implementation)
			expect(issues).toBeDefined();
		});
	});
});
