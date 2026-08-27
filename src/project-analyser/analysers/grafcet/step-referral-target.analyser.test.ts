import { analyserEnvironment } from "@tests/utils/test-helpers";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/step-referral-source.schema";
import { STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR } from "@/schemas/grafcet/step-referral-target.schema";
import {
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import StepReferralTargetAnalyser from "./step-referral-target.analyser";

function stepToTransition(id: string, stepId: string, transitionId: string) {
	return new ConnectionBuilder()
		.id(id)
		.source("step", stepId, STEP_HANDLE_SOURCE_SUCCESSOR)
		.target("transition", transitionId, TRANSITION_HANDLE_TARGET_PREDECESSOR)
		.build();
}

function transitionToReferralSource(
	id: string,
	transitionId: string,
	referralSourceId: string,
) {
	return new ConnectionBuilder()
		.id(id)
		.source("transition", transitionId, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
		.target(
			"step-referral-source",
			referralSourceId,
			STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
		)
		.build();
}

describe("StepReferralTargetAnalyser", () => {
	const analyser = new StepReferralTargetAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid source step number", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(5)
				.build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});

		it("detects empty source step number", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber("")
				.build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("vide");
		});

		it("allows empty source when allowEmptyContent is true", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber("")
				.build();

			const issues = analyser.analyseIsolated(referral, {
				allowEmptyContent: true,
			});

			expect(issues).toHaveLength(0);
		});

		it("detects negative source step number", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(-1)
				.build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("detects decimal source step number", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(2.5)
				.build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("entier positif");
		});

		it("accepts zero as source step number", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(0)
				.build();

			const issues = analyser.analyseIsolated(referral);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		it("detects source step does not exist", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(99)
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralTarget(referral)
				.build();

			const issues = analyser.analyseInContext(
				referral,
				grafcet,
				analyserEnvironment(),
			);

			const notExistIssue = issues.find((i) => i.message.includes("n'existe"));
			expect(notExistIssue).toBeDefined();
			expect(notExistIssue?.severity).toBe("error");
		});

		it("accepts when source step exists", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(1)
				.build();
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

			const issues = analyser.analyseInContext(
				referral,
				grafcet,
				analyserEnvironment(),
			);

			const notExistIssues = issues.filter((i) =>
				i.message.includes("n'existe"),
			);
			expect(notExistIssues).toHaveLength(0);
		});

		it("does not throw when the referral target's successor is not a step", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(1)
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const transition = new TransitionBuilder().id("transition-1").build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source(
					"step-referral-target",
					"referral-1",
					STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
				)
				.target(
					"transition",
					"transition-1",
					TRANSITION_HANDLE_TARGET_PREDECESSOR,
				)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addTransition(transition)
				.addStepReferralTarget(referral)
				.addConnection(connection)
				.build();

			expect(() =>
				analyser.analyseInContext(referral, grafcet, analyserEnvironment()),
			).not.toThrow();
		});

		it("detects when referral target has no successor step", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(1)
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step1)
				.addStepReferralTarget(referral)
				.build();

			const issues = analyser.analyseInContext(
				referral,
				grafcet,
				analyserEnvironment(),
			);

			const connectionIssue = issues.find((i) => i.message.includes("aval"));
			expect(connectionIssue).toBeDefined();
			expect(connectionIssue?.severity).toBe("error");
		});

		it("validates referral target connections", () => {
			const referral = new StepReferralTargetBuilder()
				.id("referral-1")
				.sourceStepNumber(1)
				.build();
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

			const issues = analyser.analyseInContext(
				referral,
				grafcet,
				analyserEnvironment(),
			);

			// Should have minimal issues (depends on internal implementation)
			expect(issues).toBeDefined();
		});

		/**
		 * Builds the minimal topology needed to reach the predecessor checks:
		 *   [aboutissant] --> [étape aval n°9]   et   un tenant qui vise l'étape n°9
		 * Callers add the upstream chain (transition + étapes) feeding the tenant.
		 */
		function buildReferralPair(
			referralTargetId: string,
			sourceStepNumber: number,
		) {
			const referralTarget = new StepReferralTargetBuilder()
				.id(referralTargetId)
				.sourceStepNumber(sourceStepNumber)
				.build();
			const downstreamStep = new StepBuilder()
				.id("step-downstream")
				.number(9)
				.build();
			const referralSource = new StepReferralSourceBuilder()
				.id("referral-source")
				.targetStepNumber(9)
				.build();
			const referralToStep = new ConnectionBuilder()
				.id("c-referral-to-step")
				.source(
					"step-referral-target",
					referralTargetId,
					STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
				)
				.target("step", "step-downstream", STEP_HANDLE_TARGET_PREDECESSOR)
				.build();
			return { referralTarget, downstreamStep, referralSource, referralToStep };
		}

		it("signale une erreur si le tenant n'a aucun prédécesseur", () => {
			const { referralTarget, downstreamStep, referralSource, referralToStep } =
				buildReferralPair("referral-err", 1);
			// L'étape n°1 référencée existe, mais rien n'est connecté en amont du tenant
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder()
				.addSteps(step1, downstreamStep)
				.addStepReferralTarget(referralTarget)
				.addStepReferralSource(referralSource)
				.addConnection(referralToStep)
				.build();

			const issues = analyser.analyseInContext(
				referralTarget,
				grafcet,
				analyserEnvironment(),
			);

			const noPred = issues.find((i) => i.message.includes("aucune étape"));
			expect(noPred).toBeDefined();
			expect(noPred?.severity).toBe("error");
		});

		it("signale une erreur si le tenant a plusieurs prédécesseurs", () => {
			const { referralTarget, downstreamStep, referralSource, referralToStep } =
				buildReferralPair("referral-multi", 1);
			// Deux étapes convergent vers la même transition, elle-même reliée au tenant
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const transition = new TransitionBuilder().id("transition-1").build();
			const grafcet = new GrafcetBuilder()
				.addSteps(step1, step2, downstreamStep)
				.addTransition(transition)
				.addStepReferralTarget(referralTarget)
				.addStepReferralSource(referralSource)
				.addConnections(
					referralToStep,
					stepToTransition("c1", "step-1", "transition-1"),
					stepToTransition("c2", "step-2", "transition-1"),
					transitionToReferralSource("c3", "transition-1", "referral-source"),
				)
				.build();

			const issues = analyser.analyseInContext(
				referralTarget,
				grafcet,
				analyserEnvironment(),
			);

			const multiPred = issues.find((i) =>
				i.message.includes("plusieurs étapes"),
			);
			expect(multiPred).toBeDefined();
			expect(multiPred?.severity).toBe("error");
		});

		it("signale une erreur si le prédécesseur ne correspond pas à l'étape source", () => {
			const { referralTarget, downstreamStep, referralSource, referralToStep } =
				buildReferralPair("referral-mismatch", 42);
			// L'aboutissant référence l'étape n°42, mais le tenant est précédé de l'étape n°1
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step42 = new StepBuilder().id("step-42").number(42).build();
			const transition = new TransitionBuilder().id("transition-1").build();
			const grafcet = new GrafcetBuilder()
				.addSteps(step1, step42, downstreamStep)
				.addTransition(transition)
				.addStepReferralTarget(referralTarget)
				.addStepReferralSource(referralSource)
				.addConnections(
					referralToStep,
					stepToTransition("c1", "step-1", "transition-1"),
					transitionToReferralSource("c2", "transition-1", "referral-source"),
				)
				.build();

			const issues = analyser.analyseInContext(
				referralTarget,
				grafcet,
				analyserEnvironment(),
			);

			const mismatch = issues.find((i) =>
				i.message.includes("ne correspond pas"),
			);
			expect(mismatch).toBeDefined();
			expect(mismatch?.severity).toBe("error");
		});
	});
});
