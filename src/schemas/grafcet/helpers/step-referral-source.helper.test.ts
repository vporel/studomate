import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionOrEndBuilder from "../builders/junction-or-end.builder";
import StepReferralSourceBuilder from "../builders/step-referral-source.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import { ElementType } from "../element.schema";
import StepReferralSourceHelper from "./step-referral-source.helper";

let connectionCount = 0;
function conn(
	sType: ElementType,
	sId: string,
	sHandle: string,
	tType: ElementType,
	tId: string,
	tHandle: string,
) {
	return new ConnectionBuilder()
		.id(`c${connectionCount++}`)
		.source(sType, sId, sHandle)
		.target(tType, tId, tHandle)
		.build();
}

const step = (id: string, number: number) =>
	new StepBuilder().id(id).number(number).build();
const transition = (id: string) =>
	new TransitionBuilder().id(id).expression("VRAI").build();
const referral = () =>
	new StepReferralSourceBuilder().id("r").targetStepNumber(1).build();
const ids = (steps: { id: string }[]) => steps.map((s) => s.id).sort();

const stepToTransition = (s: string, t: string) =>
	conn("step", s, "source:successor", "transition", t, "target:predecessor");
const transitionToReferral = (t: string) =>
	conn(
		"transition",
		t,
		"source:successor",
		"step-referral-source",
		"r",
		"target:predecessor",
	);

describe("StepReferralSourceHelper", () => {
	describe("getPredecessorSteps", () => {
		it("returns the steps before the transition feeding the referral", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1))
				.addTransition(transition("t"))
				.addStepReferralSource(referral())
				.addConnections(stepToTransition("s1", "t"), transitionToReferral("t"))
				.build();
			expect(
				ids(StepReferralSourceHelper.getPredecessorSteps("r", grafcet)),
			).toEqual(["s1"]);
		});

		it("returns the steps of every branch of an OR convergence", () => {
			const jEnd = new JunctionOrEndBuilder().id("je").nBranches(2).build();
			const [b1, b2] = jEnd.data.branchesOrder;
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1), step("s2", 2))
				.addTransitions(transition("t1"), transition("t2"))
				.addJunctionOrEnd(jEnd)
				.addStepReferralSource(referral())
				.addConnections(
					stepToTransition("s1", "t1"),
					stepToTransition("s2", "t2"),
					conn(
						"transition",
						"t1",
						"source:successor",
						"junction-or-end",
						"je",
						b1,
					),
					conn(
						"transition",
						"t2",
						"source:successor",
						"junction-or-end",
						"je",
						b2,
					),
					conn(
						"junction-or-end",
						"je",
						"pivot",
						"step-referral-source",
						"r",
						"target:predecessor",
					),
				)
				.build();
			expect(
				ids(StepReferralSourceHelper.getPredecessorSteps("r", grafcet)),
			).toEqual(["s1", "s2"]);
		});

		it("returns nothing without predecessor", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addStepReferralSource(referral())
				.build();
			expect(
				StepReferralSourceHelper.getPredecessorSteps("r", grafcet),
			).toEqual([]);
		});
	});

	describe("hasPredecessor", () => {
		it("is true when a connection reaches the referral", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addTransition(transition("t"))
				.addStepReferralSource(referral())
				.addConnections(transitionToReferral("t"))
				.build();
			expect(StepReferralSourceHelper.hasPredecessor("r", grafcet)).toBe(true);
		});

		it("is false for an orphan referral", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addStepReferralSource(referral())
				.build();
			expect(StepReferralSourceHelper.hasPredecessor("r", grafcet)).toBe(false);
		});
	});

	describe("getDirectUniquePredecessorStep", () => {
		it("returns the step before the transition in the nominal case", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1))
				.addTransition(transition("t"))
				.addStepReferralSource(referral())
				.addConnections(stepToTransition("s1", "t"), transitionToReferral("t"))
				.build();
			expect(
				StepReferralSourceHelper.getDirectUniquePredecessorStep("r", grafcet)
					?.id,
			).toBe("s1");
		});

		it("returns null when a junction sits between the transition and the referral", () => {
			const jEnd = new JunctionOrEndBuilder().id("je").nBranches(2).build();
			const [b1] = jEnd.data.branchesOrder;
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1))
				.addTransition(transition("t"))
				.addJunctionOrEnd(jEnd)
				.addStepReferralSource(referral())
				.addConnections(
					stepToTransition("s1", "t"),
					conn(
						"transition",
						"t",
						"source:successor",
						"junction-or-end",
						"je",
						b1,
					),
					conn(
						"junction-or-end",
						"je",
						"pivot",
						"step-referral-source",
						"r",
						"target:predecessor",
					),
				)
				.build();
			expect(
				StepReferralSourceHelper.getDirectUniquePredecessorStep("r", grafcet),
			).toBeNull();
		});

		it("returns null when several connections reach the referral", () => {
			const grafcet = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1), step("s2", 2))
				.addTransitions(transition("t1"), transition("t2"))
				.addStepReferralSource(referral())
				.addConnections(
					stepToTransition("s1", "t1"),
					stepToTransition("s2", "t2"),
					transitionToReferral("t1"),
					transitionToReferral("t2"),
				)
				.build();
			expect(
				StepReferralSourceHelper.getDirectUniquePredecessorStep("r", grafcet),
			).toBeNull();
		});
	});
});
