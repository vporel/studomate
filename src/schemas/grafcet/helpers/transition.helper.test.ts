import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionAndEndBuilder from "../builders/junction-and-end.builder";
import JunctionAndStartBuilder from "../builders/junction-and-start.builder";
import JunctionOrEndBuilder from "../builders/junction-or-end.builder";
import JunctionOrStartBuilder from "../builders/junction-or-start.builder";
import StepReferralSourceBuilder from "../builders/step-referral-source.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import { ElementType } from "../element.schema";
import TransitionHelper from "./transition.helper";

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
const ids = (steps: { id: string }[]) => steps.map((s) => s.id).sort();

describe("TransitionHelper.getSuccessorSteps", () => {
	it("returns the step directly connected", () => {
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addSteps(step("s1", 1))
			.addTransition(transition("t"))
			.addConnections(
				conn(
					"transition",
					"t",
					"source:successor",
					"step",
					"s1",
					"target:predecessor",
				),
			)
			.build();
		expect(ids(TransitionHelper.getSuccessorSteps("t", grafcet))).toEqual([
			"s1",
		]);
	});

	it("returns every step of an AND divergence", () => {
		const jAnd = new JunctionAndStartBuilder().id("ja").nBranches(2).build();
		const [b1, b2] = jAnd.data.branchesOrder;
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addSteps(step("s1", 1), step("s2", 2))
			.addTransition(transition("t"))
			.addJunctionAndStart(jAnd)
			.addConnections(
				conn(
					"transition",
					"t",
					"source:successor",
					"junction-and-start",
					"ja",
					"pivot",
				),
				conn(
					"junction-and-start",
					"ja",
					b1,
					"step",
					"s1",
					"target:predecessor",
				),
				conn(
					"junction-and-start",
					"ja",
					b2,
					"step",
					"s2",
					"target:predecessor",
				),
			)
			.build();
		expect(ids(TransitionHelper.getSuccessorSteps("t", grafcet))).toEqual([
			"s1",
			"s2",
		]);
	});

	describe("through a step referral", () => {
		const build = (targetNumber: number | "") =>
			new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1), step("s2", 2))
				.addTransition(transition("t"))
				.addStepReferralSource(
					new StepReferralSourceBuilder()
						.id("r")
						.targetStepNumber(targetNumber)
						.build(),
				)
				.addConnections(
					conn(
						"transition",
						"t",
						"source:successor",
						"step-referral-source",
						"r",
						"target:predecessor",
					),
				)
				.build();

		it("resolves the step designated by the number", () => {
			expect(ids(TransitionHelper.getSuccessorSteps("t", build(2)))).toEqual([
				"s2",
			]);
		});

		it("returns nothing when no step carries the number", () => {
			expect(TransitionHelper.getSuccessorSteps("t", build(9))).toEqual([]);
		});

		it("returns nothing when the number is empty", () => {
			expect(TransitionHelper.getSuccessorSteps("t", build(""))).toEqual([]);
		});
	});

	describe("through an OR convergence", () => {
		const build = (
			pivotTarget: "step" | "referral",
			targetNumber: number | "" = 1,
		) => {
			const jEnd = new JunctionOrEndBuilder().id("je").nBranches(2).build();
			const [b1] = jEnd.data.branchesOrder;
			const builder = new GrafcetBuilder()
				.id("g")
				.addSteps(step("s1", 1), step("s2", 2))
				.addTransition(transition("t"))
				.addJunctionOrEnd(jEnd)
				.addConnections(
					conn(
						"transition",
						"t",
						"source:successor",
						"junction-or-end",
						"je",
						b1,
					),
				);
			if (pivotTarget === "step") {
				builder.addConnections(
					conn(
						"junction-or-end",
						"je",
						"pivot",
						"step",
						"s2",
						"target:predecessor",
					),
				);
			} else {
				builder
					.addStepReferralSource(
						new StepReferralSourceBuilder()
							.id("r")
							.targetStepNumber(targetNumber)
							.build(),
					)
					.addConnections(
						conn(
							"junction-or-end",
							"je",
							"pivot",
							"step-referral-source",
							"r",
							"target:predecessor",
						),
					);
			}
			return builder.build();
		};

		it("returns the step reached by the pivot", () => {
			expect(
				ids(TransitionHelper.getSuccessorSteps("t", build("step"))),
			).toEqual(["s2"]);
		});

		it("resolves a step referral reached by the pivot", () => {
			expect(
				ids(TransitionHelper.getSuccessorSteps("t", build("referral", 1))),
			).toEqual(["s1"]);
		});

		it("returns nothing when the referral number is unresolved", () => {
			expect(
				TransitionHelper.getSuccessorSteps("t", build("referral", 9)),
			).toEqual([]);
		});

		it("returns nothing when the referral number is empty", () => {
			expect(
				TransitionHelper.getSuccessorSteps("t", build("referral", "")),
			).toEqual([]);
		});
	});

	it("throws on an unexpected target type", () => {
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addTransition(transition("t"))
			.addTransition(transition("t2"))
			.addConnections(
				conn(
					"transition",
					"t",
					"source:successor",
					"transition",
					"t2",
					"target:predecessor",
				),
			)
			.build();
		expect(() => TransitionHelper.getSuccessorSteps("t", grafcet)).toThrow(
			/Unexpected target type/,
		);
	});
});

describe("TransitionHelper.getPredecessorSteps", () => {
	it("returns a directly connected step", () => {
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addSteps(step("s1", 1))
			.addTransition(transition("t"))
			.addConnections(
				conn(
					"step",
					"s1",
					"source:successor",
					"transition",
					"t",
					"target:predecessor",
				),
			)
			.build();
		expect(ids(TransitionHelper.getPredecessorSteps("t", grafcet))).toEqual([
			"s1",
		]);
	});

	it("returns the steps joined by an AND convergence", () => {
		const jAnd = new JunctionAndEndBuilder().id("jae").nBranches(2).build();
		const [b1, b2] = jAnd.data.branchesOrder;
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addSteps(step("s1", 1), step("s2", 2))
			.addTransition(transition("t"))
			.addJunctionAndEnd(jAnd)
			.addConnections(
				conn("step", "s1", "source:successor", "junction-and-end", "jae", b1),
				conn("step", "s2", "source:successor", "junction-and-end", "jae", b2),
				conn(
					"junction-and-end",
					"jae",
					"pivot",
					"transition",
					"t",
					"target:predecessor",
				),
			)
			.build();
		expect(ids(TransitionHelper.getPredecessorSteps("t", grafcet))).toEqual([
			"s1",
			"s2",
		]);
	});

	it("returns the step before an OR divergence", () => {
		const jOr = new JunctionOrStartBuilder().id("jos").nBranches(2).build();
		const [b1] = jOr.data.branchesOrder;
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addSteps(step("s1", 1))
			.addTransition(transition("t"))
			.addJunctionOrStart(jOr)
			.addConnections(
				conn(
					"step",
					"s1",
					"source:successor",
					"junction-or-start",
					"jos",
					"pivot",
				),
				conn(
					"junction-or-start",
					"jos",
					b1,
					"transition",
					"t",
					"target:predecessor",
				),
			)
			.build();
		expect(ids(TransitionHelper.getPredecessorSteps("t", grafcet))).toEqual([
			"s1",
		]);
	});

	it("throws on an unexpected predecessor type", () => {
		const grafcet = new GrafcetBuilder()
			.id("g")
			.addTransition(transition("t"))
			.addTransition(transition("t2"))
			.addConnections(
				conn(
					"transition",
					"t2",
					"source:successor",
					"transition",
					"t",
					"target:predecessor",
				),
			)
			.build();
		expect(() => TransitionHelper.getPredecessorSteps("t", grafcet)).toThrow(
			/should only have steps/,
		);
	});
});
