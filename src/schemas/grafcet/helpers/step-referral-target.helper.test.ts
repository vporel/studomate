import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import StepReferralSourceBuilder from "../builders/step-referral-source.builder";
import StepReferralTargetBuilder from "../builders/step-referral-target.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import { STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR } from "../step-referral-target.schema";
import StepReferralTargetHelper from "./step-referral-target.helper";

describe("StepReferralTargetHelper", () => {
	const referral = new StepReferralTargetBuilder()
		.id("r")
		.sourceStepNumber(1)
		.build();
	const step = new StepBuilder().id("s9").number(9).build();

	const toNode = (id: string, type: "step" | "transition", target: string) =>
		new ConnectionBuilder()
			.id(id)
			.source(
				"step-referral-target",
				"r",
				STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
			)
			.target(type, target, "target:predecessor")
			.build();

	describe("getTargetStep", () => {
		it("returns null for an unknown referral", () => {
			expect(
				StepReferralTargetHelper.getTargetStep(
					"nope",
					new GrafcetBuilder().build(),
				),
			).toBeNull();
		});

		it("returns null when the source step number is empty", () => {
			const empty = new StepReferralTargetBuilder()
				.id("r")
				.sourceStepNumber("")
				.build();
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(empty)
				.addStep(step)
				.addConnection(toNode("c", "step", "s9"))
				.build();
			expect(StepReferralTargetHelper.getTargetStep("r", grafcet)).toBeNull();
		});

		it("returns null when nothing follows the referral", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.build();
			expect(StepReferralTargetHelper.getTargetStep("r", grafcet)).toBeNull();
		});

		it("returns the step following the referral", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addStep(step)
				.addConnection(toNode("c", "step", "s9"))
				.build();
			expect(StepReferralTargetHelper.getTargetStep("r", grafcet)).toBe(step);
		});

		it("returns null when the connected step does not exist", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addConnection(toNode("c", "step", "ghost"))
				.build();
			expect(StepReferralTargetHelper.getTargetStep("r", grafcet)).toBeNull();
		});

		it("throws when the referral has more than one successor", () => {
			const other = new StepBuilder().id("s10").number(10).build();
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addSteps(step, other)
				.addConnections(toNode("c1", "step", "s9"), toNode("c2", "step", "s10"))
				.build();
			expect(() =>
				StepReferralTargetHelper.getTargetStep("r", grafcet),
			).toThrow("more than one successor");
		});

		it("throws when the successor is not a step", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addTransition(new TransitionBuilder().id("t").build())
				.addConnection(toNode("c", "transition", "t"))
				.build();
			expect(() =>
				StepReferralTargetHelper.getTargetStep("r", grafcet),
			).toThrow("should be a step");
		});
	});

	describe("getStepReferralSource", () => {
		const source = new StepReferralSourceBuilder()
			.id("src")
			.targetStepNumber(9)
			.build();

		it("returns null for an unknown referral", () => {
			expect(
				StepReferralTargetHelper.getStepReferralSource(
					"nope",
					new GrafcetBuilder().build(),
				),
			).toBeNull();
		});

		it("returns null when the source step number is empty", () => {
			const empty = new StepReferralTargetBuilder()
				.id("r")
				.sourceStepNumber("")
				.build();
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(empty)
				.addStepReferralSource(source)
				.build();
			expect(
				StepReferralTargetHelper.getStepReferralSource("r", grafcet),
			).toBeNull();
		});

		it("returns null when the referral has no successor step", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addStepReferralSource(source)
				.build();
			expect(
				StepReferralTargetHelper.getStepReferralSource("r", grafcet),
			).toBeNull();
		});

		it("returns the source aiming at the successor step number", () => {
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addStep(step)
				.addStepReferralSource(source)
				.addConnection(toNode("c", "step", "s9"))
				.build();
			expect(StepReferralTargetHelper.getStepReferralSource("r", grafcet)).toBe(
				source,
			);
		});

		it("returns null when no source aims at the successor step", () => {
			const elsewhere = new StepReferralSourceBuilder()
				.id("src")
				.targetStepNumber(4)
				.build();
			const grafcet = new GrafcetBuilder()
				.addStepReferralTarget(referral)
				.addStep(step)
				.addStepReferralSource(elsewhere)
				.addConnection(toNode("c", "step", "s9"))
				.build();
			expect(
				StepReferralTargetHelper.getStepReferralSource("r", grafcet),
			).toBeNull();
		});
	});
});
