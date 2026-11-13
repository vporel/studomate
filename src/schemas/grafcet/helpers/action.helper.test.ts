import ActionBuilder from "../builders/action.builder";
import ConnectionBuilder from "../builders/connection.builder";
import { actionLink } from "@tests/utils/grafcet-factory";
import GrafcetBuilder from "../builders/grafcet.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import ActionHelper from "./action.helper";

function grafcetOf(
	actionIds: string[],
	connections: ReturnType<typeof actionLink>[],
) {
	let builder = new GrafcetBuilder().addStep(
		new StepBuilder().id("s").number(1).build(),
	);
	for (const id of actionIds)
		builder = builder.addAction(new ActionBuilder().id(id).build());
	return builder.addConnections(...connections).build();
}

// s → a1 → a2 → a3
const chain = () =>
	grafcetOf(
		["a1", "a2", "a3"],
		[
			actionLink("step", "s", "a1"),
			actionLink("action", "a1", "a2"),
			actionLink("action", "a2", "a3"),
		],
	);

describe("ActionHelper.getPrevious / getNext", () => {
	it("returns the step or the action right before, and the action right after", () => {
		const grafcet = chain();

		expect(ActionHelper.getPrevious("a1", grafcet)?.id).toBe("s");
		expect(ActionHelper.getPrevious("a2", grafcet)?.id).toBe("a1");
		expect(ActionHelper.getNext("a1", grafcet)?.id).toBe("a2");
		expect(ActionHelper.getNext("a3", grafcet)).toBeNull();
	});

	it("returns null for an action linked to nothing", () => {
		const grafcet = grafcetOf(["a"], []);

		expect(ActionHelper.getPrevious("a", grafcet)).toBeNull();
		expect(ActionHelper.getNext("a", grafcet)).toBeNull();
	});

	it("throws when the action is activated by an element that is neither a step nor an action", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(new TransitionBuilder().id("t").build())
			.addAction(new ActionBuilder().id("a").build())
			.addConnection(
				new ConnectionBuilder()
					.id("c")
					.source("transition", "t", "source:successor")
					.target("action", "a", "target:predecessor")
					.build(),
			)
			.build();

		expect(() => ActionHelper.getPrevious("a", grafcet)).toThrow();
	});
});

describe("ActionHelper.getChainFrom", () => {
	it("returns the actions chained after the action, in order", () => {
		expect(ActionHelper.getChainFrom("a1", chain()).map((a) => a.id)).toEqual([
			"a2",
			"a3",
		]);
		expect(ActionHelper.getChainFrom("a3", chain())).toEqual([]);
	});

	it("walks a loop of actions once", () => {
		const grafcet = grafcetOf(
			["a1", "a2"],
			[actionLink("action", "a1", "a2"), actionLink("action", "a2", "a1")],
		);

		expect(ActionHelper.getChainFrom("a1", grafcet).map((a) => a.id)).toEqual([
			"a2",
		]);
	});
});

describe("ActionHelper.getStep", () => {
	it("returns the step, directly or through the chained actions", () => {
		const grafcet = chain();

		expect(ActionHelper.getStep("a1", grafcet)?.id).toBe("s");
		expect(ActionHelper.getStep("a3", grafcet)?.id).toBe("s");
	});

	it("keeps a chain together once its step link is gone, without a step", () => {
		const grafcet = grafcetOf(["a1", "a2"], [actionLink("action", "a1", "a2")]);

		expect(ActionHelper.getStep("a2", grafcet)).toBeNull();
		expect(ActionHelper.getPrevious("a2", grafcet)?.id).toBe("a1");
	});

	it("returns null for a loop of actions", () => {
		const grafcet = grafcetOf(
			["a1", "a2"],
			[actionLink("action", "a1", "a2"), actionLink("action", "a2", "a1")],
		);

		expect(ActionHelper.getStep("a1", grafcet)).toBeNull();
	});
});

describe("ActionHelper.isInLoop", () => {
	it("is true for the actions of a loop", () => {
		const grafcet = grafcetOf(
			["a1", "a2"],
			[actionLink("action", "a1", "a2"), actionLink("action", "a2", "a1")],
		);

		expect(ActionHelper.isInLoop("a1", grafcet)).toBe(true);
		expect(ActionHelper.isInLoop("a2", grafcet)).toBe(true);
	});

	it("is false for the actions of a chain, linked to a step or not", () => {
		expect(ActionHelper.isInLoop("a3", chain())).toBe(false);
		const detached = grafcetOf(
			["a1", "a2"],
			[actionLink("action", "a1", "a2")],
		);
		expect(ActionHelper.isInLoop("a2", detached)).toBe(false);
	});
});

describe("ActionHelper: removing an element of a chain", () => {
	it("keeps the chain together when its step is removed", () => {
		const grafcet = chain();

		grafcet.removeElements([{ type: "step", id: "s" }]);

		expect(ActionHelper.getStep("a1", grafcet)).toBeNull();
		expect(ActionHelper.getChainFrom("a1", grafcet).map((a) => a.id)).toEqual([
			"a2",
			"a3",
		]);
	});

	it("detaches the end of the chain when an action in the middle is removed", () => {
		const grafcet = chain();

		grafcet.removeElements([{ type: "action", id: "a2" }]);

		expect(ActionHelper.getNext("a1", grafcet)).toBeNull();
		expect(ActionHelper.getPrevious("a3", grafcet)).toBeNull();
		expect(ActionHelper.getStep("a1", grafcet)?.id).toBe("s");
	});
});
