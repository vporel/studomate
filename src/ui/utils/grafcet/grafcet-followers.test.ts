import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import getFollowers from "./grafcet-followers";
import { actionLink } from "@tests/utils/grafcet-factory";

const summary = (
	grafcet: Grafcet,
	id: string,
	positionOf?: (element: any) => { x: number; y: number },
) =>
	getFollowers(grafcet.getElementById(id)!, grafcet, positionOf)
		.filter((f) => f.follows)
		.map((f) => `${f.element.id}:${f.axis}`);

function stepWithActions(actions: { id: string; x: number; y: number }[]) {
	let builder = new GrafcetBuilder().addStep(
		new StepBuilder().id("s").number(1).position(100, 100).build(),
	);
	for (const { id, x, y } of actions) {
		builder = builder
			.addAction(new ActionBuilder().id(id).position(x, y).build())
			.addConnection(actionLink("step", "s", id));
	}
	return builder.build();
}

function transitionWithReferral(referralX: number) {
	return new GrafcetBuilder()
		.addTransition(new TransitionBuilder().id("t").position(100, 100).build())
		.addStepReferralSource(
			new StepReferralSourceBuilder().id("r").position(referralX, 140).build(),
		)
		.addConnection(
			new ConnectionBuilder()
				.id("c")
				.source("transition", "t", "source:successor")
				.target("step-referral-source", "r", "target:predecessor")
				.build(),
		)
		.build();
}

function stepWithReferral(referralX: number) {
	return new GrafcetBuilder()
		.addStep(new StepBuilder().id("s").number(1).position(100, 100).build())
		.addStepReferralTarget(
			new StepReferralTargetBuilder().id("r").position(referralX, 40).build(),
		)
		.addConnection(
			new ConnectionBuilder()
				.id("c")
				.source("step-referral-target", "r", "source:successor")
				.target("step", "s", "target:predecessor")
				.build(),
		)
		.build();
}

describe("getFollowers: actions of a step", () => {
	it("follow vertically when the action directly to the right is on the row of the step", () => {
		const grafcet = stepWithActions([
			{ id: "a1", x: 180, y: 100 },
			{ id: "a2", x: 280, y: 100 },
		]);

		expect(summary(grafcet, "s")).toEqual(["a1:y", "a2:y"]);
	});

	it("accept an offset of less than 3px between the centers, and refuse 3px", () => {
		for (const [y, expected] of [
			[102, ["a1:y"]],
			[98, ["a1:y"]],
			[103, []],
			[97, []],
			[110, []],
		] as const) {
			expect(summary(stepWithActions([{ id: "a1", x: 180, y }]), "s")).toEqual(
				expected,
			);
		}
	});

	it("do not follow when the action directly to the right is not on the row", () => {
		const grafcet = stepWithActions([
			{ id: "a1", x: 180, y: 160 },
			{ id: "a2", x: 280, y: 100 },
		]);

		expect(summary(grafcet, "s")).toEqual([]);
	});

	it("all follow, whatever their own row, when the action directly to the right is aligned", () => {
		const grafcet = stepWithActions([
			{ id: "far", x: 400, y: 300 },
			{ id: "a1", x: 180, y: 100 },
		]);

		expect(summary(grafcet, "s").sort()).toEqual(["a1:y", "far:y"]);
	});

	it("start to follow when the step reaches their row while it is moved", () => {
		const grafcet = stepWithActions([{ id: "a1", x: 180, y: 300 }]);
		const stepAt = (y: number) => (element: any) =>
			element.id === "s" ? { x: 100, y } : element.position;

		expect(summary(grafcet, "s", stepAt(100))).toEqual([]);
		expect(summary(grafcet, "s", stepAt(250))).toEqual([]);
		expect(summary(grafcet, "s", stepAt(297))).toEqual([]);
		expect(summary(grafcet, "s", stepAt(298))).toEqual(["a1:y"]);
		expect(summary(grafcet, "s", stepAt(302))).toEqual(["a1:y"]);
		expect(summary(grafcet, "s", stepAt(303))).toEqual([]);
	});

	it("use the live position of the action directly to the right", () => {
		const grafcet = stepWithActions([{ id: "a1", x: 180, y: 300 }]);
		const actionAt = (y: number) => (element: any) =>
			element.id === "a1" ? { x: 180, y } : element.position;

		expect(summary(grafcet, "s", actionAt(300))).toEqual([]);
		expect(summary(grafcet, "s", actionAt(102))).toEqual(["a1:y"]);
	});

	it("are none for a step without action", () => {
		expect(summary(stepWithActions([]), "s")).toEqual([]);
	});
});

describe("getFollowers: step referrals", () => {
	it("a referral below a transition follows it horizontally when it is in its column", () => {
		expect(summary(transitionWithReferral(100), "t")).toEqual(["r:x"]);
	});

	it("a referral that leads to a step follows it horizontally when it is in its column", () => {
		expect(summary(stepWithReferral(100), "s")).toEqual(["r:x"]);
	});

	it.each([
		["transition", transitionWithReferral, "t"],
		["step", stepWithReferral, "s"],
	] as const)(
		"a referral follows a %s only when it is offset by less than 3px",
		(_, build, id) => {
			expect(summary(build(102), id)).toEqual([`r:x`]);
			expect(summary(build(103), id)).toEqual([]);
			expect(summary(build(98), id)).toEqual([`r:x`]);
			expect(summary(build(97), id)).toEqual([]);
			expect(summary(build(110), id)).toEqual([]);
		},
	);

	it("a referral starts to follow when the transition reaches its column while it is moved", () => {
		const grafcet = transitionWithReferral(300);
		const transitionAt = (x: number) => (element: any) =>
			element.id === "t" ? { x, y: 100 } : element.position;

		expect(summary(grafcet, "t", transitionAt(100))).toEqual([]);
		expect(summary(grafcet, "t", transitionAt(250))).toEqual([]);
		expect(summary(grafcet, "t", transitionAt(297))).toEqual([]);
		expect(summary(grafcet, "t", transitionAt(298))).toEqual(["r:x"]);
		expect(summary(grafcet, "t", transitionAt(300))).toEqual(["r:x"]);
		expect(summary(grafcet, "t", transitionAt(302))).toEqual(["r:x"]);
		expect(summary(grafcet, "t", transitionAt(303))).toEqual([]);
	});

	it("a referral starts to follow when the step reaches its column while it is moved", () => {
		const grafcet = stepWithReferral(300);
		const stepAt = (x: number) => (element: any) =>
			element.id === "s" ? { x, y: 100 } : element.position;

		expect(summary(grafcet, "s", stepAt(100))).toEqual([]);
		expect(summary(grafcet, "s", stepAt(300))).toEqual(["r:x"]);
	});

	it("uses the live position of the referral", () => {
		const grafcet = transitionWithReferral(300);
		const referralAt = (x: number) => (element: any) =>
			element.id === "r" ? { x, y: 140 } : element.position;

		expect(summary(grafcet, "t", referralAt(300))).toEqual([]);
		expect(summary(grafcet, "t", referralAt(101))).toEqual(["r:x"]);
	});
});

describe("getFollowers: chained actions", () => {
	// s → a1 → a2 → a3, and b linked directly to s
	function chained(a2Y = 100) {
		return new GrafcetBuilder()
			.addStep(new StepBuilder().id("s").number(1).position(100, 100).build())
			.addAction(new ActionBuilder().id("a1").position(180, 100).build())
			.addAction(new ActionBuilder().id("a2").position(280, a2Y).build())
			.addAction(new ActionBuilder().id("a3").position(380, a2Y).build())
			.addAction(new ActionBuilder().id("b").position(180, 300).build())
			.addConnections(
				actionLink("step", "s", "a1"),
				actionLink("step", "s", "b"),
				actionLink("action", "a1", "a2"),
				actionLink("action", "a2", "a3"),
			)
			.build();
	}

	it("the actions chained after a moved action follow it vertically when the next one is on its row", () => {
		expect(summary(chained(), "a1")).toEqual(["a2:y", "a3:y"]);
		expect(summary(chained(), "a2")).toEqual(["a3:y"]);
	});

	it("the actions chained after it do not follow when the next one is not on its row", () => {
		expect(summary(chained(160), "a1")).toEqual([]);
	});

	it("the other actions linked directly to the step do not follow a moved action", () => {
		const followers = getFollowers(
			chained().getElementById("a1")!,
			chained(),
		).map((f) => f.element.id);

		expect(followers).not.toContain("b");
	});

	it("nothing follows the last action of a chain", () => {
		expect(summary(chained(), "a3")).toEqual([]);
	});

	it("the chained actions follow the step with the others", () => {
		expect(summary(chained(), "s").sort()).toEqual([
			"a1:y",
			"a2:y",
			"a3:y",
			"b:y",
		]);
	});
});

describe("getFollowers: other elements", () => {
	it("nothing follows a step referral", () => {
		const grafcet = transitionWithReferral(100);

		expect(summary(grafcet, "r")).toEqual([]);
	});
});
