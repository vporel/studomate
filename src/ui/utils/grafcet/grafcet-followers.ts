import Element from "@/schemas/grafcet/element.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { XYPosition } from "@/schemas/grafcet/shared-types";
import { centerX, centerY } from "./grafcet-geometry";
import { isStraightLinkOffset } from "./grafcet-utils";

/** An element tied to a moved one, and whether it goes along with it on `axis` right now. */
export type Follower = {
	element: Element<any>;
	axis: "x" | "y";
	follows: boolean;
};

/**
 * Elements tied to a moved one, and which of them go along with it:
 * - the step referrals tied to a step or to a transition follow it horizontally when they are in
 *   its column;
 * - the actions of a step follow it vertically when the action directly to its right is on its
 *   row;
 * - the actions chained after an action follow it vertically when the next one is on its row (the
 *   other actions linked directly to the same step do not).
 * Alignment is evaluated on the current positions (`positionOf`), so that an element starts
 * following as soon as the moved one reaches its column or row while it is dragged. The other
 * axis, and any element that is not aligned, stay up to the user.
 */
export default function getFollowers(
	moved: Element<any>,
	grafcet: Grafcet,
	positionOf: (element: Element<any>) => XYPosition = (e) => e.position,
): Follower[] {
	const referralFollowers = (referrals: Element<any>[]): Follower[] =>
		referrals.map((element) => ({
			element,
			axis: "x",
			follows: isStraightLinkOffset(
				centerX(element, positionOf(element)) -
					centerX(moved, positionOf(moved)),
			),
		}));

	switch (moved.type) {
		case "step": {
			const actions = StepHelper.getActions(moved.id, grafcet);
			const firstAction = actions.reduce<Element<any> | undefined>(
				(first, action) =>
					!first || positionOf(action).x < positionOf(first).x ? action : first,
				undefined,
			);
			const actionsFollow =
				!!firstAction &&
				isStraightLinkOffset(
					centerY(firstAction, positionOf(firstAction)) -
						centerY(moved, positionOf(moved)),
				);
			return [
				...actions.map((element) => ({
					element,
					axis: "y" as const,
					follows: actionsFollow,
				})),
				...referralFollowers(
					StepHelper.getPredecessorReferrals(moved.id, grafcet),
				),
			];
		}
		case "action": {
			const chain = ActionHelper.getChainFrom(moved.id, grafcet);
			const chainFollows =
				chain.length > 0 &&
				isStraightLinkOffset(
					centerY(chain[0], positionOf(chain[0])) -
						centerY(moved, positionOf(moved)),
				);
			return chain.map((element) => ({
				element,
				axis: "y" as const,
				follows: chainFollows,
			}));
		}
		case "transition":
			return referralFollowers(
				TransitionHelper.getSuccessorReferrals(moved.id, grafcet),
			);
		default:
			return [];
	}
}
