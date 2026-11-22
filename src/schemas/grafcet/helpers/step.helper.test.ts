import ActionBuilder from "../builders/action.builder";
import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import StepBuilder from "../builders/step.builder";
import StepReferralTargetBuilder from "../builders/step-referral-target.builder";
import TransitionBuilder from "../builders/transition.builder";
import { StepData } from "../step.schema";
import StepHelper from "./step.helper";
import { actionLink } from "@tests/utils/grafcet-factory";

describe("StepHelper.isInitial", () => {
	it("is true only when initial is true", () => {
		expect(StepHelper.isInitial({ number: 0, initial: true })).toBe(true);
	});

	it("is false when initial is false", () => {
		expect(StepHelper.isInitial({ number: 0, initial: false })).toBe(false);
	});

	it("is false when initial is undefined", () => {
		expect(StepHelper.isInitial({ number: 0 })).toBe(false);
	});
});

describe("StepHelper.hasNumber", () => {
	it("is true for 0 although falsy", () => {
		expect(StepHelper.hasNumber({ number: 0 })).toBe(true);
	});

	it("is true for a positive integer", () => {
		expect(StepHelper.hasNumber({ number: 12 })).toBe(true);
	});

	it("is false for an empty number", () => {
		expect(StepHelper.hasNumber({ number: "" })).toBe(false);
	});

	it("is false for a null number", () => {
		expect(StepHelper.hasNumber({ number: null } as unknown as StepData)).toBe(
			false,
		);
	});

	it("is false for an undefined number", () => {
		expect(
			StepHelper.hasNumber({ number: undefined } as unknown as StepData),
		).toBe(false);
	});
});

describe("StepHelper.getValidNumber", () => {
	it.each([0, 1, 3, 100])("returns %i", (n) => {
		expect(StepHelper.getValidNumber({ number: n })).toBe(n);
	});

	it.each([-1, 1.5, NaN, "", null, undefined])("returns null for %p", (n) => {
		expect(
			StepHelper.getValidNumber({ number: n } as unknown as StepData),
		).toBeNull();
	});
});

describe("StepHelper.getStepVariableMnemonic", () => {
	it.each([
		[0, "X0"],
		[1, "X1"],
		[100, "X100"],
	])("builds the mnemonic of step %i", (n, expected) => {
		expect(StepHelper.getStepVariableMnemonic(n)).toBe(expected);
	});
});

describe("StepHelper.parseStepVariableMnemonic", () => {
	it.each([
		["X0", 0],
		["X12", 12],
	])("parses %s as %i", (mnemonic, expected) => {
		expect(StepHelper.parseStepVariableMnemonic(mnemonic)).toBe(expected);
	});

	it.each(["X", "Xa", "X-1", "Y3", "X1.5", ""])(
		"returns null for %p",
		(mnemonic) => {
			expect(StepHelper.parseStepVariableMnemonic(mnemonic)).toBeNull();
		},
	);

	it.each([0, 1, 7, 42, 100])("round-trips step number %i", (n) => {
		expect(
			StepHelper.parseStepVariableMnemonic(
				StepHelper.getStepVariableMnemonic(n),
			),
		).toBe(n);
	});
});

describe("StepHelper.getNextActionPosition", () => {
	const stepWithActions = (actions: { id: string; x: number; y: number }[]) => {
		let builder = new GrafcetBuilder().addStep(
			new StepBuilder().id("s").number(1).position(100, 60).build(),
		);
		for (const { id, x, y } of actions) {
			builder = builder
				.addAction(new ActionBuilder().id(id).position(x, y).build())
				.addConnection(actionLink("step", "s", id));
		}
		return builder.build();
	};

	it("is 80px to the right of the step, on its line, when it has no action", () => {
		expect(StepHelper.getNextActionPosition("s", stepWithActions([]))).toEqual({
			x: 180,
			y: 60,
		});
	});

	it("is flush against the rightmost action when the step has some", () => {
		const grafcet = stepWithActions([
			{ id: "far", x: 400, y: 70 },
			{ id: "near", x: 180, y: 60 },
		]);

		// action default width = 100
		expect(StepHelper.getNextActionPosition("s", grafcet)).toEqual({
			x: 500,
			y: 70,
		});
	});
});

describe("StepHelper: chained actions", () => {
	const grafcetOf = (
		actions: { id: string; x: number; y?: number }[],
		connections: ReturnType<typeof actionLink>[],
	) => {
		let builder = new GrafcetBuilder().addStep(
			new StepBuilder().id("s").number(1).position(100, 60).build(),
		);
		for (const { id, x, y = 60 } of actions)
			builder = builder.addAction(
				new ActionBuilder().id(id).position(x, y).build(),
			);
		return builder.addConnections(...connections).build();
	};

	it("getActions returns each direct action followed by its chain", () => {
		// s → a1 → a2, s → b1 → b2
		const grafcet = grafcetOf(
			[
				{ id: "a1", x: 180 },
				{ id: "a2", x: 280 },
				{ id: "b1", x: 180, y: 200 },
				{ id: "b2", x: 280, y: 200 },
			],
			[
				actionLink("step", "s", "a1"),
				actionLink("action", "a1", "a2"),
				actionLink("step", "s", "b1"),
				actionLink("action", "b1", "b2"),
			],
		);

		expect(StepHelper.getActions("s", grafcet).map((a) => a.id)).toEqual([
			"a1",
			"a2",
			"b1",
			"b2",
		]);
		expect(StepHelper.getDirectActions("s", grafcet).map((a) => a.id)).toEqual([
			"a1",
			"b1",
		]);
	});

	it("places the next action after the rightmost action of the chains", () => {
		const grafcet = grafcetOf(
			[
				{ id: "a1", x: 180 },
				{ id: "a2", x: 280 },
			],
			[actionLink("step", "s", "a1"), actionLink("action", "a1", "a2")],
		);

		expect(StepHelper.getNextActionPosition("s", grafcet)).toEqual({
			x: 380,
			y: 60,
		});
	});

	it("links a new action to the step when it has none", () => {
		expect(StepHelper.getNextActionLinkSource("s", grafcetOf([], []))).toEqual({
			type: "step",
			id: "s",
			handle: "source:action",
		});
	});

	it("chains a new action after the last action of the chain of the rightmost action", () => {
		// s → a1 → a2 → a3, with a2 dragged to the far right
		const grafcet = grafcetOf(
			[
				{ id: "a1", x: 180 },
				{ id: "a2", x: 600 },
				{ id: "a3", x: 280 },
			],
			[
				actionLink("step", "s", "a1"),
				actionLink("action", "a1", "a2"),
				actionLink("action", "a2", "a3"),
			],
		);

		expect(StepHelper.getNextActionLinkSource("s", grafcet)).toEqual({
			type: "action",
			id: "a3",
			handle: "source:next",
		});
	});

	it("chains after the rightmost of several actions linked directly to the step", () => {
		const grafcet = grafcetOf(
			[
				{ id: "a1", x: 180 },
				{ id: "a2", x: 280 },
			],
			[actionLink("step", "s", "a1"), actionLink("step", "s", "a2")],
		);

		expect(StepHelper.getNextActionLinkSource("s", grafcet)).toEqual({
			type: "action",
			id: "a2",
			handle: "source:next",
		});
	});
});

describe("StepHelper.getPredecessorReferrals", () => {
	const link = (id: string, sourceType: any, sourceId: string) =>
		new ConnectionBuilder()
			.id(id)
			.source(sourceType, sourceId, "source:successor")
			.target("step", "s", "target:predecessor")
			.build();

	it("returns the step referrals that lead to the step", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(new StepBuilder().id("s").number(1).build())
			.addStepReferralTarget(new StepReferralTargetBuilder().id("r").build())
			.addConnection(link("c", "step-referral-target", "r"))
			.build();

		expect(
			StepHelper.getPredecessorReferrals("s", grafcet).map((r) => r.id),
		).toEqual(["r"]);
	});

	it("ignores the other predecessors of the step", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(new StepBuilder().id("s").number(1).build())
			.addTransition(new TransitionBuilder().id("t").build())
			.addConnection(link("c", "transition", "t"))
			.build();

		expect(StepHelper.getPredecessorReferrals("s", grafcet)).toEqual([]);
	});

	it("ignores the referrals linked to another step", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(new StepBuilder().id("s").number(1).build())
			.addStep(new StepBuilder().id("other").number(2).build())
			.addStepReferralTarget(new StepReferralTargetBuilder().id("r").build())
			.addConnection(
				new ConnectionBuilder()
					.id("c")
					.source("step-referral-target", "r", "source:successor")
					.target("step", "other", "target:predecessor")
					.build(),
			)
			.build();

		expect(StepHelper.getPredecessorReferrals("s", grafcet)).toEqual([]);
	});
});
