import { clamp } from "@/lib/number";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import {
	ACTION_HANDLE_SOURCE_NEXT,
	ACTION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/action.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import {
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import { STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/step-referral-source.schema";
import { STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR } from "@/schemas/grafcet/step-referral-target.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import { Dimensions, XYPosition } from "@/schemas/grafcet/shared-types";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { Box, bottom, centerX, centerY, right } from "./grafcet-geometry";

/**
 * Maximum gap, in px, between a placed element and its neighbour for them to be linked. A gap is
 * positive when the elements are apart and negative when they overlap; an overlap is corrected
 * back to a gap of 0.
 */
export const AUTO_CONNECT_GAP_TOLERANCE = 20;

/** Maximum offset, in px, between the centres of two elements for them to count as aligned. */
export const AUTO_CONNECT_ALIGN_TOLERANCE = 10;

/**
 * Maximum horizontal gap, in px, between a placed action and the step or action on its left for
 * them to be linked, apart or overlapping.
 */
export const ACTION_AUTO_CONNECT_X_TOLERANCE = 30;

export type PlacedElement = {
	id: string;
	type: ElementType;
	position: XYPosition;
	size: Dimensions;
};

export type AutoConnection = {
	source: { type: ElementType; id: string; handle: string };
	target: { type: ElementType; id: string; handle: string };
};

export type AutoPlacement = {
	connections: AutoConnection[];
	/** Position of the placed element once any overlap with a linked neighbour is removed. */
	position: XYPosition;
};

type Neighbour = { element: Element<any>; gap: number };

const SUCCESSOR_HANDLES: Partial<Record<ElementType, string>> = {
	step: STEP_HANDLE_SOURCE_SUCCESSOR,
	transition: TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	"step-referral-target": STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
};

const PREDECESSOR_HANDLES: Partial<Record<ElementType, string>> = {
	step: STEP_HANDLE_TARGET_PREDECESSOR,
	transition: TRANSITION_HANDLE_TARGET_PREDECESSOR,
	"step-referral-source": STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
};

/** Types an element can be linked to when it is placed below them (their successor to its predecessor). */
const TYPES_ABOVE: Partial<Record<ElementType, readonly ElementType[]>> = {
	step: ["transition", "step-referral-target"],
	transition: ["step"],
	"step-referral-source": ["transition"],
};

/** Types an element can be linked to when it is placed above them (its successor to their predecessor). */
const TYPES_BELOW: Partial<Record<ElementType, readonly ElementType[]>> = {
	step: ["transition"],
	transition: ["step", "step-referral-source"],
	"step-referral-target": ["step"],
};

function nearest(candidates: Neighbour[]): Neighbour | undefined {
	let best: Neighbour | undefined;
	for (const candidate of candidates) {
		if (!best || Math.abs(candidate.gap) < Math.abs(best.gap)) best = candidate;
	}
	return best;
}

const isWithinTolerance = ({ gap }: Neighbour) =>
	gap >= -AUTO_CONNECT_GAP_TOLERANCE && gap <= AUTO_CONNECT_GAP_TOLERANCE;

function isHandleFree(grafcet: Grafcet, id: string, handle: string): boolean {
	return grafcet.getConnectionsByElementIdAndHandle(id, handle).length === 0;
}

/**
 * Vertical shift that brings the gap to every given neighbour into [0, tolerance], as small as
 * possible. `gap` is signed in the direction of the shift: moving the placed element by `dy`
 * changes the gap above by `+dy` and the gap below by `-dy`.
 * Returns null when no shift satisfies all the neighbours.
 */
function shiftForNeighbours(
	gapAbove: number | undefined,
	gapBelow: number | undefined,
): number | null {
	let lo = -Infinity;
	let hi = Infinity;
	if (gapAbove !== undefined) {
		lo = Math.max(lo, -gapAbove);
		hi = Math.min(hi, AUTO_CONNECT_GAP_TOLERANCE - gapAbove);
	}
	if (gapBelow !== undefined) {
		lo = Math.max(lo, gapBelow - AUTO_CONNECT_GAP_TOLERANCE);
		hi = Math.min(hi, gapBelow);
	}
	if (lo > hi) return null;
	return clamp(0, lo, hi);
}

/** A step, a transition or a step referral placed above or below an element it can be linked to. */
function computeVerticalPlacement(
	placed: PlacedElement,
	grafcet: Grafcet,
): AutoPlacement {
	const alignedOfTypes = (types: readonly ElementType[] | undefined) =>
		(types ?? [])
			.flatMap((type) => grafcet.getElementsByType<Element<any>>(type))
			.filter(
				(e) => Math.abs(centerX(e) - centerX(placed)) <= AUTO_CONNECT_ALIGN_TOLERANCE,
			);
	const placedPredecessor = PREDECESSOR_HANDLES[placed.type];
	const placedSuccessor = SUCCESSOR_HANDLES[placed.type];

	const above: Neighbour | undefined =
		placedPredecessor && isHandleFree(grafcet, placed.id, placedPredecessor)
			? nearest(
					alignedOfTypes(TYPES_ABOVE[placed.type])
						.filter(
							(e) =>
								centerY(e) < centerY(placed) &&
								isHandleFree(
									grafcet,
									e.id,
									SUCCESSOR_HANDLES[e.type as ElementType]!,
								),
						)
						.map((e) => ({ element: e, gap: placed.position.y - bottom(e) }))
						.filter(isWithinTolerance),
				)
			: undefined;
	let below: Neighbour | undefined =
		placedSuccessor && isHandleFree(grafcet, placed.id, placedSuccessor)
			? nearest(
					alignedOfTypes(TYPES_BELOW[placed.type])
						.filter(
							(e) =>
								centerY(e) > centerY(placed) &&
								isHandleFree(
									grafcet,
									e.id,
									PREDECESSOR_HANDLES[e.type as ElementType]!,
								),
						)
						.map((e) => ({ element: e, gap: e.position.y - bottom(placed) }))
						.filter(isWithinTolerance),
				)
			: undefined;

	let dy = shiftForNeighbours(above?.gap, below?.gap);
	if (dy === null && above && below) {
		//The space between both neighbours is too small: the element sticks to the one above and
		//overlaps the one below without being linked to it.
		below = undefined;
		dy = shiftForNeighbours(above.gap, undefined);
	}

	const connections: AutoConnection[] = [];
	if (above)
		connections.push({
			source: {
				type: above.element.type as ElementType,
				id: above.element.id,
				handle: SUCCESSOR_HANDLES[above.element.type as ElementType]!,
			},
			target: {
				type: placed.type,
				id: placed.id,
				handle: placedPredecessor!,
			},
		});
	if (below)
		connections.push({
			source: {
				type: placed.type,
				id: placed.id,
				handle: placedSuccessor!,
			},
			target: {
				type: below.element.type as ElementType,
				id: below.element.id,
				handle: PREDECESSOR_HANDLES[below.element.type as ElementType]!,
			},
		});
	//Centers are aligned on the nearest linked neighbour (the one above when equally near).
	const reference =
		above && below
			? Math.abs(below.gap) < Math.abs(above.gap)
				? below
				: above
			: (above ?? below);
	return {
		connections,
		position: {
			x: reference
				? placed.position.x + centerX(reference.element) - centerX(placed)
				: placed.position.x,
			y: placed.position.y + (dy ?? 0),
		},
	};
}

/** Whether no action other than the placed one overlaps it once moved to `position`. */
function isFreeForAction(
	position: XYPosition,
	placed: PlacedElement,
	grafcet: Grafcet,
): boolean {
	return grafcet
		.getElementsByType<Element<any>>("action")
		.every(
			(action) =>
				action.id === placed.id ||
				action.position.x >= position.x + placed.size.width ||
				right(action) <= position.x ||
				action.position.y >= position.y + placed.size.height ||
				bottom(action) <= position.y,
		);
}

/**
 * An action placed to the right of a step, or to the right of an action activated by a step. An
 * action has a single incoming link, so at most one step is chosen: the nearest one.
 * - Against an action: the placed action is chained at the end of that action's chain (right
 *   after it when nothing is chained to it yet), flush against it, when no other action is in the
 *   way there.
 * - Otherwise, and against a step: it is linked to the step when it has no action yet, else
 *   chained after the last action of the chain of the step's rightmost action, flush against that
 *   rightmost action.
 */
function computeActionPlacement(
	placed: PlacedElement,
	grafcet: Grafcet,
): AutoPlacement {
	const none: AutoPlacement = { connections: [], position: placed.position };
	if (!isHandleFree(grafcet, placed.id, ACTION_HANDLE_TARGET_PREDECESSOR))
		return none;

	const isAligned = (e: Box) =>
		Math.abs(centerY(e) - centerY(placed)) <= AUTO_CONNECT_ALIGN_TOLERANCE;
	const gapTo = (e: Box) => placed.position.x - right(e);
	const isWithinXTolerance = ({ gap }: Neighbour) =>
		Math.abs(gap) <= ACTION_AUTO_CONNECT_X_TOLERANCE;
	const stepOf = (actionId: string) => {
		try {
			return ActionHelper.getStep(actionId, grafcet);
		} catch {
			return null;
		}
	};

	type ActionNeighbour = Neighbour & { stepId: string };
	const candidates: ActionNeighbour[] = [];
	for (const step of grafcet.getElementsByType<Element<any>>("step")) {
		const candidate = { element: step, gap: gapTo(step), stepId: step.id };
		if (isAligned(step) && isWithinXTolerance(candidate))
			candidates.push(candidate);
	}
	for (const action of grafcet.getElementsByType<Element<any>>("action")) {
		if (action.id === placed.id || !isAligned(action)) continue;
		const step = stepOf(action.id);
		if (!step) continue;
		const candidate = {
			element: action,
			gap: gapTo(action),
			stepId: step.id,
		};
		if (isWithinXTolerance(candidate)) candidates.push(candidate);
	}

	const chosen = nearest(candidates) as ActionNeighbour | undefined;
	if (!chosen) return none;
	const placement = (
		source: AutoConnection["source"],
		position: XYPosition,
	): AutoPlacement => ({
		connections: [
			{
				source,
				target: {
					type: "action",
					id: placed.id,
					handle: ACTION_HANDLE_TARGET_PREDECESSOR,
				},
			},
		],
		position,
	});

	if (chosen.element.type === "action") {
		const anchor =
			ActionHelper.getChainFrom(chosen.element.id, grafcet).at(-1) ??
			chosen.element;
		const position = { x: right(anchor), y: anchor.position.y };
		if (isFreeForAction(position, placed, grafcet))
			return placement(
				{ type: "action", id: anchor.id, handle: ACTION_HANDLE_SOURCE_NEXT },
				position,
			);
	}
	return placement(
		StepHelper.getNextActionLinkSource(chosen.stepId, grafcet),
		StepHelper.getNextActionPosition(chosen.stepId, grafcet),
	);
}

/**
 * Links to create when an element is dropped from the toolbar or has just been moved: a step, a
 * transition or a step referral against the elements above and below it that it can be linked to
 * (step ↔ transition, transition → step referral source, step referral target → step), an action against the step (or an
 * action activated by a step) on its left. Only free handles are used, so existing links are
 * never replaced. The position of the element is corrected once it is linked: for a step and a
 * transition, the gap along the linking axis is brought to 0 when the elements overlap and the
 * centers are aligned on the other axis; an action takes the place the "add action" menu entry
 * would give it.
 */
export default function computeAutoConnections(
	placed: PlacedElement,
	grafcet: Grafcet,
): AutoPlacement {
	switch (placed.type) {
		case "step":
		case "transition":
		case "step-referral-source":
		case "step-referral-target":
			return computeVerticalPlacement(placed, grafcet);
		case "action":
			return computeActionPlacement(placed, grafcet);
		default:
			return { connections: [], position: placed.position };
	}
}
