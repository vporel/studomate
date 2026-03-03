import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import StepReferralSourceAnalyser from "./step-referral-source.analyser";

describe("StepReferralSourceAnalyser", () => {
	const analyser = new StepReferralSourceAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid target step number", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(5).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});

		it("detects empty target step number", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber("").build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("vide");
		});

		it("allows empty target when allowEmptyContent is true", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber("").build();

			const issues = analyser.analyseIsolated(referral, { allowEmptyContent: true });

			expect(issues).toHaveLength(0);
		});

		it("detects negative target step number", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(-1).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("detects decimal target step number", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(2.5).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("accepts zero as target step number", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(0).build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects target step does not exist", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(99).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralSource(referral)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const notExistIssue = issues.find((i) => i.message.includes("n'existe"));
			expect(notExistIssue).toBeDefined();
			expect(notExistIssue?.severity).toBe("error");
		});

		it("accepts when target step exists", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("step-referral-source", "referral-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralSource(referral)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const notExistIssues = issues.filter((i) => i.message.includes("n'existe"));
			expect(notExistIssues).toHaveLength(0);
		});

		it("detects when referral source has no predecessor", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(2).build();
			const step2 = new StepBuilder().id("step-2").number(2).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step2)
				.addStepReferralSource(referral)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			// Should have error about missing connection
			expect(issues.length).toBeGreaterThan(0);
		});

		it("detects self-referral", () => {
			const referral = new StepReferralSourceBuilder().id("referral-1").targetStepNumber(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step-referral-source", "referral-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addTransition(transition)
				.addStepReferralSource(referral)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(referral, grafcet, []);

			const selfRefIssue = issues.find((i) => i.message.includes("référer l'étape"));
			expect(selfRefIssue).toBeDefined();
			expect(selfRefIssue?.severity).toBe("error");
		});
	});
});
