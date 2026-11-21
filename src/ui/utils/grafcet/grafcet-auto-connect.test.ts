import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ConnectionsValidator from "@/schemas/grafcet/validators/connections.validator";
import { ElementType } from "@/schemas/grafcet/element.schema";
import computeAutoConnections, { PlacedElement } from "./grafcet-auto-connect";
import { actionLink } from "@tests/utils/grafcet-factory";

// Step 40x40, transition 40x30, action 100x40 (default dimensions).
const step = (id: string, x: number, y: number) =>
	new StepBuilder().id(id).number(1).position(x, y).build();
const transition = (id: string, x: number, y: number) =>
	new TransitionBuilder().id(id).position(x, y).build();
const action = (id: string, x: number, y: number) =>
	new ActionBuilder().id(id).position(x, y).build();

const referralSource = (id: string, x: number, y: number) =>
	new StepReferralSourceBuilder().id(id).position(x, y).build();
const referralTarget = (id: string, x: number, y: number) =>
	new StepReferralTargetBuilder().id(id).position(x, y).build();

const SIZES = {
	"step-referral-source": { width: 40, height: 40 },
	"step-referral-target": { width: 40, height: 40 },
	step: { width: 40, height: 40 },
	transition: { width: 40, height: 30 },
	action: { width: 100, height: 40 },
} as const;

function dropped(
	type:
		| "step"
		| "transition"
		| "action"
		| "step-referral-source"
		| "step-referral-target",
	x: number,
	y: number,
): PlacedElement {
	return { id: "dropped", type, position: { x, y }, size: SIZES[type] };
}

function link(
	grafcet: GrafcetBuilder,
	sourceType: ElementType,
	sourceId: string,
	sourceHandle: string,
	targetType: ElementType,
	targetId: string,
	targetHandle: string,
) {
	return grafcet.addConnection(
		new ConnectionBuilder()
			.id(`${sourceId}->${targetId}`)
			.source(sourceType, sourceId, sourceHandle)
			.target(targetType, targetId, targetHandle)
			.build(),
	);
}

const connectionsOf = (placed: PlacedElement, grafcet: Grafcet) =>
	computeAutoConnections(placed, grafcet).connections;

const ids = (connections: ReturnType<typeof connectionsOf>) =>
	connections.map((c) => `${c.source.id}->${c.target.id}`);

describe("computeAutoConnections: step and transition", () => {
	it("links a transition dropped below a step", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		const result = connectionsOf(dropped("transition", 100, 150), grafcet);

		expect(result).toEqual([
			{
				source: { type: "step", id: "s", handle: "source:successor" },
				target: {
					type: "transition",
					id: "dropped",
					handle: "target:predecessor",
				},
			},
		]);
	});

	it("links a transition dropped above a step", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 200)).build();

		const result = connectionsOf(dropped("transition", 100, 160), grafcet);

		expect(result).toEqual([
			{
				source: {
					type: "transition",
					id: "dropped",
					handle: "source:successor",
				},
				target: { type: "step", id: "s", handle: "target:predecessor" },
			},
		]);
	});

	it("links a step dropped below a transition", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();

		const result = connectionsOf(dropped("step", 100, 140), grafcet);

		expect(ids(result)).toEqual(["t->dropped"]);
	});

	it("links a step dropped above a transition", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 200))
			.build();

		const result = connectionsOf(dropped("step", 100, 150), grafcet);

		expect(ids(result)).toEqual(["dropped->t"]);
	});

	it("accepts a gap of exactly 20px and refuses 21px", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(
			connectionsOf(dropped("transition", 100, 160), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("transition", 100, 161), grafcet),
		).toHaveLength(0);
	});

	it("treats an overlap as a gap: accepted up to 20px, refused at 21px, below the neighbour", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		// step bottom = 140
		expect(
			connectionsOf(dropped("transition", 100, 135), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("transition", 100, 120), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("transition", 100, 119), grafcet),
		).toHaveLength(0);
	});

	it("treats an overlap as a gap: accepted up to 20px, refused at 21px, above the neighbour", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 200)).build();

		// transition bottom = y + 30, step top = 200
		expect(
			connectionsOf(dropped("transition", 100, 175), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("transition", 100, 190), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("transition", 100, 191), grafcet),
		).toHaveLength(0);
	});

	it("prefers the neighbour with the smallest gap whether it overlaps or not", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("overlapping", 100, 95))
			.addStep(step("spaced", 100, 100))
			.build();

		// overlapping bottom = 135 (overlap 5 with a drop at 130), spaced bottom = 140 (gap 10 at 150)
		expect(
			ids(connectionsOf(dropped("transition", 100, 130), grafcet)),
		).toEqual(["overlapping->dropped"]);
	});

	it("accepts a horizontal offset of 10px on each side and refuses 11px", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(
			connectionsOf(dropped("transition", 110, 150), grafcet),
		).toHaveLength(1);
		expect(connectionsOf(dropped("transition", 90, 150), grafcet)).toHaveLength(
			1,
		);
		expect(
			connectionsOf(dropped("transition", 111, 150), grafcet),
		).toHaveLength(0);
		expect(connectionsOf(dropped("transition", 89, 150), grafcet)).toHaveLength(
			0,
		);
	});

	it("measures the offset between centers, whatever the widths", () => {
		const wide = new StepBuilder()
			.id("wide")
			.number(1)
			.dimensions(100, 40)
			.position(100, 100)
			.build();
		const grafcet = new GrafcetBuilder().addStep(wide).build();

		// wide center x = 150, dropped transition (40 wide) at x=130 has center 150
		expect(
			connectionsOf(dropped("transition", 130, 150), grafcet),
		).toHaveLength(1);
	});

	it("links both neighbours when the element is dropped between two", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("below", 100, 190))
			.build();

		const result = connectionsOf(dropped("transition", 100, 150), grafcet);

		expect(ids(result)).toEqual(["above->dropped", "dropped->below"]);
	});

	it("keeps only the nearest neighbour on a given side", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("far", 100, 100))
			.addStep(step("near", 100, 108))
			.build();

		const result = connectionsOf(dropped("transition", 100, 150), grafcet);

		expect(ids(result)).toEqual(["near->dropped"]);
	});

	it("ignores a neighbour whose handle is already linked", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addTransition(transition("existing", 100, 300));
		const grafcet = link(
			builder,
			"step",
			"s",
			"source:successor",
			"transition",
			"existing",
			"target:predecessor",
		).build();

		expect(connectionsOf(dropped("transition", 100, 150), grafcet)).toEqual([]);
	});

	it("ignores a neighbour below whose predecessor handle is already linked", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("prev", 100, 0))
			.addTransition(transition("t", 100, 200));
		const grafcet = link(
			builder,
			"step",
			"prev",
			"source:successor",
			"transition",
			"t",
			"target:predecessor",
		).build();

		expect(connectionsOf(dropped("step", 100, 160), grafcet)).toEqual([]);
	});

	it("never pairs two elements of the same kind", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(connectionsOf(dropped("step", 100, 150), grafcet)).toEqual([]);
	});

	it("produces connections accepted by the connections validator", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("below", 100, 190))
			.build();
		const result = connectionsOf(dropped("transition", 100, 150), grafcet);
		grafcet.addElements([
			{
				type: "transition",
				id: "dropped",
				data: { expression: "" },
				position: { x: 100, y: 150 },
			},
		]);

		expect(result).toHaveLength(2);
		for (const c of result) {
			expect(
				ConnectionsValidator.validateNewConnection(
					{
						sourceId: c.source.id,
						targetId: c.target.id,
						sourceHandle: c.source.handle,
						targetHandle: c.target.handle,
					},
					grafcet,
				),
			).toBe(true);
		}
	});
});

describe("computeAutoConnections: action", () => {
	function stepWithAction(): Grafcet {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addAction(action("a1", 150, 100));
		return link(
			builder,
			"step",
			"s",
			"source:action",
			"action",
			"a1",
			"target:predecessor",
		).build();
	}

	it("links an action dropped to the right of a step", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		const result = connectionsOf(dropped("action", 150, 100), grafcet);

		expect(result).toEqual([
			{
				source: { type: "step", id: "s", handle: "source:action" },
				target: { type: "action", id: "dropped", handle: "target:predecessor" },
			},
		]);
	});

	it("accepts a horizontal gap of exactly 30px and refuses 31px", () => {
		// step right edge = 140
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(connectionsOf(dropped("action", 170, 100), grafcet)).toHaveLength(1);
		expect(connectionsOf(dropped("action", 171, 100), grafcet)).toHaveLength(0);
	});

	it("accepts a horizontal overlap of exactly 30px and refuses 31px", () => {
		// step right edge = 140
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(connectionsOf(dropped("action", 110, 100), grafcet)).toHaveLength(1);
		expect(connectionsOf(dropped("action", 109, 100), grafcet)).toHaveLength(0);
	});

	it("applies the 30px horizontal tolerance against an action linked to a step", () => {
		// a1 right edge = 250
		expect(
			connectionsOf(dropped("action", 280, 100), stepWithAction()),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("action", 281, 100), stepWithAction()),
		).toHaveLength(0);
	});

	it("requires the action to be vertically aligned within 10px", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(connectionsOf(dropped("action", 140, 110), grafcet)).toHaveLength(1);
		expect(connectionsOf(dropped("action", 140, 111), grafcet)).toHaveLength(0);
	});

	it("does not link an action dropped to the left of a step", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 300, 100)).build();

		expect(connectionsOf(dropped("action", 190, 100), grafcet)).toEqual([]);
	});

	it("chains an action dropped next to an action activated by a step after it", () => {
		const result = connectionsOf(dropped("action", 250, 100), stepWithAction());

		expect(result).toEqual([
			{
				source: { type: "action", id: "a1", handle: "source:next" },
				target: { type: "action", id: "dropped", handle: "target:predecessor" },
			},
		]);
	});

	it("chains an action dropped next to a step that already has an action after that action", () => {
		const result = connectionsOf(dropped("action", 145, 100), stepWithAction());

		expect(ids(result)).toEqual(["a1->dropped"]);
	});

	it("chains an action dropped next to an action at the end of a chain, not only a direct one", () => {
		// s → a1 → a2
		const grafcet = link(
			link(
				new GrafcetBuilder()
					.addStep(step("s", 100, 100))
					.addAction(action("a1", 150, 100))
					.addAction(action("a2", 250, 100)),
				"step",
				"s",
				"source:action",
				"action",
				"a1",
				"target:predecessor",
			),
			"action",
			"a1",
			"source:next",
			"action",
			"a2",
			"target:predecessor",
		).build();

		const result = computeAutoConnections(dropped("action", 355, 100), grafcet);

		expect(ids(result.connections)).toEqual(["a2->dropped"]);
		expect(result.position).toEqual({ x: 350, y: 100 });
	});

	it("does not link an action dropped next to an action that is linked to no step", () => {
		const grafcet = new GrafcetBuilder()
			.addAction(action("orphan", 150, 100))
			.build();

		expect(connectionsOf(dropped("action", 250, 100), grafcet)).toEqual([]);
	});

	it("chains after the rightmost action when the step already has the maximum number of direct actions", () => {
		let builder = new GrafcetBuilder().addStep(step("s", 100, 100));
		for (let i = 0; i < 4; i++) {
			builder = link(
				builder.addAction(action(`a${i}`, 500 + i * 200, 400)),
				"step",
				"s",
				"source:action",
				"action",
				`a${i}`,
				"target:predecessor",
			);
		}

		expect(
			ids(connectionsOf(dropped("action", 150, 100), builder.build())),
		).toEqual(["a3->dropped"]);
	});

	it("keeps a single link, the nearest, when a step and an action are both within reach", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("near", 100, 100))
			.addStep(step("other", 100, 300))
			.addAction(action("a", 150, 104));
		const grafcet = link(
			builder,
			"step",
			"other",
			"source:action",
			"action",
			"a",
			"target:predecessor",
		).build();

		// step "near" ends at x=140 (gap 5 with a drop at 145), action "a" ends at x=250
		const result = connectionsOf(dropped("action", 145, 100), grafcet);

		expect(ids(result)).toEqual(["near->dropped"]);
	});
});

describe("computeAutoConnections: step referrals", () => {
	it("links a step referral source dropped below a transition", () => {
		// transition bottom = 130
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();

		const result = computeAutoConnections(
			dropped("step-referral-source", 100, 135),
			grafcet,
		);

		expect(result.connections).toEqual([
			{
				source: { type: "transition", id: "t", handle: "source:successor" },
				target: {
					type: "step-referral-source",
					id: "dropped",
					handle: "target:predecessor",
				},
			},
		]);
		expect(result.position).toEqual({ x: 100, y: 135 });
	});

	it("links a transition dropped above a step referral source", () => {
		const grafcet = new GrafcetBuilder()
			.addStepReferralSource(referralSource("r", 100, 200))
			.build();

		const result = connectionsOf(dropped("transition", 100, 168), grafcet);

		expect(result).toEqual([
			{
				source: {
					type: "transition",
					id: "dropped",
					handle: "source:successor",
				},
				target: {
					type: "step-referral-source",
					id: "r",
					handle: "target:predecessor",
				},
			},
		]);
	});

	it("links a step referral target dropped above a step", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 200)).build();

		const result = connectionsOf(
			dropped("step-referral-target", 100, 155),
			grafcet,
		);

		expect(result).toEqual([
			{
				source: {
					type: "step-referral-target",
					id: "dropped",
					handle: "source:successor",
				},
				target: { type: "step", id: "s", handle: "target:predecessor" },
			},
		]);
	});

	it("links a step dropped below a step referral target", () => {
		const grafcet = new GrafcetBuilder()
			.addStepReferralTarget(referralTarget("r", 100, 100))
			.build();

		const result = connectionsOf(dropped("step", 100, 145), grafcet);

		expect(result).toEqual([
			{
				source: {
					type: "step-referral-target",
					id: "r",
					handle: "source:successor",
				},
				target: {
					type: "step",
					id: "dropped",
					handle: "target:predecessor",
				},
			},
		]);
	});

	it("corrects the position like for any other pair", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();

		expect(
			computeAutoConnections(dropped("step-referral-source", 106, 125), grafcet)
				.position,
		).toEqual({ x: 100, y: 130 });
	});

	it("respects the gap tolerance", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();

		expect(
			connectionsOf(dropped("step-referral-source", 100, 150), grafcet),
		).toHaveLength(1);
		expect(
			connectionsOf(dropped("step-referral-source", 100, 151), grafcet),
		).toHaveLength(0);
	});

	it.each([
		["a step referral source next to a step", "step-referral-source", "step"],
		[
			"a step referral target next to a transition",
			"step-referral-target",
			"transition",
		],
		[
			"a step referral source next to a step referral target",
			"step-referral-source",
			"step-referral-target",
		],
	] as const)("never links %s", (_, placedType, neighbourType) => {
		const neighbour =
			neighbourType === "step"
				? step("n", 100, 100)
				: neighbourType === "transition"
					? transition("n", 100, 100)
					: referralTarget("n", 100, 100);
		const base = new GrafcetBuilder();
		const grafcet = (
			neighbourType === "step"
				? base.addStep(neighbour as any)
				: neighbourType === "transition"
					? base.addTransition(neighbour as any)
					: base.addStepReferralTarget(neighbour as any)
		).build();

		// below the neighbour, then above it
		expect(connectionsOf(dropped(placedType, 100, 140), grafcet)).toEqual([]);
		expect(connectionsOf(dropped(placedType, 100, 60), grafcet)).toEqual([]);
	});

	it("does not link a referral to a transition whose successor is already linked", () => {
		const builder = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.addStep(step("next", 300, 300));
		const grafcet = link(
			builder,
			"transition",
			"t",
			"source:successor",
			"step",
			"next",
			"target:predecessor",
		).build();

		expect(
			connectionsOf(dropped("step-referral-source", 100, 135), grafcet),
		).toEqual([]);
	});

	it("produces connections accepted by the connections validator", () => {
		const grafcet = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();
		const result = connectionsOf(
			dropped("step-referral-source", 100, 135),
			grafcet,
		);
		grafcet.addElements([
			{
				type: "step-referral-source",
				id: "dropped",
				data: { targetStepNumber: "" },
				position: { x: 100, y: 135 },
			},
		]);

		expect(result).toHaveLength(1);
		expect(
			ConnectionsValidator.validateNewConnection(
				{
					sourceId: result[0].source.id,
					targetId: result[0].target.id,
					sourceHandle: result[0].source.handle,
					targetHandle: result[0].target.handle,
				},
				grafcet,
			),
		).toBe(true);
	});

	it("links the transition between a step above and a referral source below", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStepReferralSource(referralSource("below", 100, 178))
			.build();

		expect(
			ids(connectionsOf(dropped("transition", 100, 140), grafcet)),
		).toEqual(["above->dropped", "dropped->below"]);
	});
});

describe("computeAutoConnections: position correction", () => {
	const positionOf = (placed: PlacedElement, grafcet: Grafcet) =>
		computeAutoConnections(placed, grafcet).position;

	it("keeps the position when the gap is between 0 and 20px", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		// step bottom = 140
		for (const y of [140, 150, 160]) {
			expect(positionOf(dropped("transition", 100, y), grafcet)).toEqual({
				x: 100,
				y,
			});
		}
	});

	it("moves a transition placed below a step down until the gap is 0", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(positionOf(dropped("transition", 100, 135), grafcet)).toEqual({
			x: 100,
			y: 140,
		});
		expect(positionOf(dropped("transition", 100, 130), grafcet)).toEqual({
			x: 100,
			y: 140,
		});
	});

	it("moves a transition placed above a step up until the gap is 0", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 200)).build();

		// transition bottom = y + 30; step top = 200
		expect(positionOf(dropped("transition", 100, 175), grafcet)).toEqual({
			x: 100,
			y: 170,
		});
	});

	it("moves a step placed below or above a transition until the gap is 0", () => {
		const below = new GrafcetBuilder()
			.addTransition(transition("t", 100, 100))
			.build();
		const above = new GrafcetBuilder()
			.addTransition(transition("t", 100, 200))
			.build();

		// transition bottom = 130
		expect(positionOf(dropped("step", 100, 125), below)).toEqual({
			x: 100,
			y: 130,
		});
		// step bottom = y + 40; transition top = 200
		expect(positionOf(dropped("step", 100, 165), above)).toEqual({
			x: 100,
			y: 160,
		});
	});

	it("aligns the center on the neighbour in the vertical case", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(positionOf(dropped("transition", 108, 135), grafcet)).toEqual({
			x: 100,
			y: 140,
		});
		expect(positionOf(dropped("transition", 92, 145), grafcet)).toEqual({
			x: 100,
			y: 145,
		});
	});

	it("aligns the centers whatever the widths", () => {
		const wide = new StepBuilder()
			.id("wide")
			.number(1)
			.dimensions(100, 40)
			.position(100, 100)
			.build();
		const grafcet = new GrafcetBuilder().addStep(wide).build();

		// wide center x = 150: a 40px transition is centered at x = 130
		expect(positionOf(dropped("transition", 138, 140), grafcet).x).toBe(130);
	});

	it("aligns on the nearest neighbour when it is linked on both sides", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("below", 106, 178))
			.build();

		// above bottom = 140 (gap 0 at y=140), below top = 178 (gap 8)
		const result = computeAutoConnections(
			dropped("transition", 103, 140),
			grafcet,
		);

		expect(ids(result.connections)).toEqual([
			"above->dropped",
			"dropped->below",
		]);
		expect(result.position.x).toBe(100);
	});

	it("keeps the position when nothing is linked, even if it overlaps", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		expect(positionOf(dropped("transition", 100, 115), grafcet)).toEqual({
			x: 100,
			y: 115,
		});
	});

	it("moves between two neighbours so that both gaps fit", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("below", 100, 178))
			.build();

		// above bottom = 140, below top = 178; a 30px transition placed at 138 overlaps above by 2 and ends 10px from below
		const result = computeAutoConnections(
			dropped("transition", 100, 138),
			grafcet,
		);

		expect(ids(result.connections)).toEqual([
			"above->dropped",
			"dropped->below",
		]);
		expect(result.position).toEqual({ x: 100, y: 140 });
	});

	it("sticks to the neighbour above when the space between both is too small", () => {
		// step 6 bottom = 40, step 7 top = 60: 20px free for a 30px transition
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 0))
			.addStep(step("below", 100, 60))
			.build();

		for (const y of [30, 35, 40]) {
			const result = computeAutoConnections(
				dropped("transition", 100, y),
				grafcet,
			);

			expect(ids(result.connections)).toEqual(["above->dropped"]);
			expect(result.position).toEqual({ x: 100, y: 40 });
		}
	});

	it("keeps the position when it already touches the neighbour above and overlaps the one below", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(step("above", 100, 0))
			.addStep(step("below", 100, 60))
			.build();

		const result = computeAutoConnections(
			dropped("transition", 100, 43),
			grafcet,
		);

		expect(ids(result.connections)).toEqual(["above->dropped"]);
		expect(result.position).toEqual({ x: 100, y: 43 });
	});

	it("places an action next to a step where the context menu would put it", () => {
		const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

		// menu: x = step x + 80, same y as the step, whatever the drop position within tolerance
		for (const [x, y] of [
			[135, 100],
			[140, 105],
			[150, 92],
			[145, 108],
		]) {
			expect(positionOf(dropped("action", x, y), grafcet)).toEqual({
				x: 180,
				y: 100,
			});
		}
	});

	it("glues an action dropped next to a step to its rightmost action", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addAction(action("a1", 180, 100))
			.addAction(action("a2", 280, 100));
		const grafcet = link(
			link(
				builder,
				"step",
				"s",
				"source:action",
				"action",
				"a1",
				"target:predecessor",
			),
			"step",
			"s",
			"source:action",
			"action",
			"a2",
			"target:predecessor",
		).build();

		expect(positionOf(dropped("action", 145, 100), grafcet)).toEqual({
			x: 380,
			y: 100,
		});
	});

	it("aligns the top of an action on a linked action", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addAction(action("a1", 150, 104));
		const grafcet = link(
			builder,
			"step",
			"s",
			"source:action",
			"action",
			"a1",
			"target:predecessor",
		).build();

		expect(positionOf(dropped("action", 250, 100), grafcet)).toEqual({
			x: 250,
			y: 104,
		});
	});

	it("glues an action placed next to a linked action to its right", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addAction(action("a1", 150, 100));
		const grafcet = link(
			builder,
			"step",
			"s",
			"source:action",
			"action",
			"a1",
			"target:predecessor",
		).build();

		// a1 right edge = 250
		expect(positionOf(dropped("action", 242, 100), grafcet)).toEqual({
			x: 250,
			y: 100,
		});
	});

	it("puts an action placed against an action in the middle of a chain after the last one", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("s", 100, 100))
			.addAction(action("a1", 180, 100))
			.addAction(action("a2", 280, 100));
		const grafcet = link(
			link(
				builder,
				"step",
				"s",
				"source:action",
				"action",
				"a1",
				"target:predecessor",
			),
			"step",
			"s",
			"source:action",
			"action",
			"a2",
			"target:predecessor",
		).build();

		// a1 right edge = 280 = a2 left edge; a2 right edge = 380
		const result = computeAutoConnections(dropped("action", 284, 100), grafcet);
		expect(result.position).toEqual({ x: 380, y: 100 });
		expect(ids(result.connections)).toEqual(["a2->dropped"]);
	});
});

describe("computeAutoConnections: action placed against an action", () => {
	type Link = ["step" | "action", string, string];
	// step "s" at (100, 100), right edge 140; actions 100 × 40 on the row of s
	function grafcetOf(actions: [string, number][], links: Link[]): Grafcet {
		let builder = new GrafcetBuilder().addStep(step("s", 100, 100));
		for (const [id, x] of actions)
			builder = builder.addAction(action(id, x, 100));
		return builder
			.addConnections(
				...links.map(([type, from, to]) => actionLink(type, from, to)),
			)
			.build();
	}

	it("glues it to an action whose next handle is free and whose right is free, even when it is not the rightmost", () => {
		const grafcet = grafcetOf(
			[
				["a1", 180],
				["b", 500],
			],
			[
				["step", "s", "a1"],
				["step", "s", "b"],
			],
		);

		const result = computeAutoConnections(dropped("action", 285, 100), grafcet);

		expect(ids(result.connections)).toEqual(["a1->dropped"]);
		expect(result.connections[0].source.handle).toBe("source:next");
		expect(result.position).toEqual({ x: 280, y: 100 });
	});

	it("goes to the end of the rightmost chain when another action is right of the action", () => {
		// a1 | a2 | a3, all linked directly to s
		const grafcet = grafcetOf(
			[
				["a1", 180],
				["a2", 280],
				["a3", 380],
			],
			[
				["step", "s", "a1"],
				["step", "s", "a2"],
				["step", "s", "a3"],
			],
		);

		const result = computeAutoConnections(dropped("action", 285, 100), grafcet);

		expect(ids(result.connections)).toEqual(["a3->dropped"]);
		expect(result.position).toEqual({ x: 480, y: 100 });
	});

	it("goes to the end of the chain of the action when something is already chained to it and that end is free", () => {
		// s → a1 → a2, b far right
		const grafcet = grafcetOf(
			[
				["a1", 180],
				["a2", 280],
				["b", 600],
			],
			[
				["step", "s", "a1"],
				["action", "a1", "a2"],
				["step", "s", "b"],
			],
		);

		const result = computeAutoConnections(dropped("action", 285, 100), grafcet);

		expect(ids(result.connections)).toEqual(["a2->dropped"]);
		expect(result.position).toEqual({ x: 380, y: 100 });
	});

	it("goes to the end of the rightmost chain when the end of the chain of the action is taken", () => {
		// s → a1 → a2, b right after a2
		const grafcet = grafcetOf(
			[
				["a1", 180],
				["a2", 280],
				["b", 380],
			],
			[
				["step", "s", "a1"],
				["action", "a1", "a2"],
				["step", "s", "b"],
			],
		);

		const result = computeAutoConnections(dropped("action", 285, 100), grafcet);

		expect(ids(result.connections)).toEqual(["b->dropped"]);
		expect(result.position).toEqual({ x: 480, y: 100 });
	});
});

describe("computeAutoConnections: already placed element", () => {
	it("does not link on a side where the moved element's own handle is taken", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("previous", 400, 0))
			.addTransition(transition("moved", 400, 60));
		const grafcet = link(
			builder,
			"step",
			"previous",
			"source:successor",
			"transition",
			"moved",
			"target:predecessor",
		).build();

		expect(
			connectionsOf(
				{
					id: "moved",
					type: "transition",
					position: { x: 100, y: 150 },
					size: SIZES.transition,
				},
				grafcet,
			),
		).toEqual([]);
	});

	it("links the moved element on a side where its own handle is free", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("above", 100, 100))
			.addStep(step("next", 400, 200))
			.addTransition(transition("moved", 400, 150));
		const grafcet = link(
			builder,
			"transition",
			"moved",
			"source:successor",
			"step",
			"next",
			"target:predecessor",
		).build();

		expect(
			ids(
				connectionsOf(
					{
						id: "moved",
						type: "transition",
						position: { x: 100, y: 150 },
						size: SIZES.transition,
					},
					grafcet,
				),
			),
		).toEqual(["above->moved"]);
	});

	it("does not link a moved action that already has a step", () => {
		const builder = new GrafcetBuilder()
			.addStep(step("owner", 400, 100))
			.addStep(step("s", 100, 100))
			.addAction(action("moved", 450, 100));
		const grafcet = link(
			builder,
			"step",
			"owner",
			"source:action",
			"action",
			"moved",
			"target:predecessor",
		).build();

		expect(
			connectionsOf(
				{
					id: "moved",
					type: "action",
					position: { x: 150, y: 100 },
					size: SIZES.action,
				},
				grafcet,
			),
		).toEqual([]);
	});

	it("never links an action to itself", () => {
		const grafcet = new GrafcetBuilder()
			.addAction(action("moved", 100, 100))
			.build();

		expect(
			connectionsOf(
				{
					id: "moved",
					type: "action",
					position: { x: 100, y: 100 },
					size: SIZES.action,
				},
				grafcet,
			),
		).toEqual([]);
	});
});

describe("computeAutoConnections: other elements", () => {
	it.each(["comment", "junction-and-start", "step-referral-source"] as const)(
		"never links a dropped %s",
		(type) => {
			const grafcet = new GrafcetBuilder().addStep(step("s", 100, 100)).build();

			expect(
				connectionsOf(
					{
						id: "dropped",
						type,
						position: { x: 100, y: 150 },
						size: { width: 40, height: 30 },
					},
					grafcet,
				),
			).toEqual([]);
		},
	);
});
