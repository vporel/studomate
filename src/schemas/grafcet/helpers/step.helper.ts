import Action, { ACTION_HANDLE_SOURCE_NEXT } from "../action.schema";
import { ConnectionSide } from "../connection.schema";
import Grafcet from "../grafcet.schema";
import ActionHelper from "./action.helper";
import StepReferralTarget from "../step-referral-target.schema";
import { XYPosition } from "../shared-types";
import Step, {
	StepData,
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "../step.schema";

/** Distance, in px, between the left of a step and its first action. */
const STEP_FIRST_ACTION_OFFSET_X = 80;

export default class StepHelper {
	/**
	 * Whether the step data flags the step as initial. Works on plain data (e.g. React Flow node data).
	 */
	static isInitial(data: StepData): boolean {
		return data.initial === true;
	}

	/**
	 * Whether the step data carries a number. Works on plain data and also covers
	 * null/undefined, which imported or migrated data may carry despite the type.
	 */
	static hasNumber(data: StepData): data is StepData & { number: number } {
		return (
			data.number !== "" && data.number !== null && data.number !== undefined
		);
	}

	/**
	 * Mnémonique de la variable synthétique X{n} associée à une étape numérotée n.
	 */
	static getStepVariableMnemonic(stepNumber: number): string {
		return `X${stepNumber}`;
	}

	/**
	 * Inverse of `getStepVariableMnemonic`: the step number encoded in an `X{n}`
	 * mnemonic, or `null` when the mnemonic does not follow the convention.
	 */
	static parseStepVariableMnemonic(mnemonic: string): number | null {
		const match = /^X(\d+)$/.exec(mnemonic);
		return match ? Number(match[1]) : null;
	}

	/**
	 * Get the next available number for a step in the grafcet
	 * It will return the number after the max number used by the steps in the grafcet
	 * @param grafcet
	 * @returns
	 */
	static getNextAvailableNumber(grafcet: Grafcet): number {
		const steps = grafcet.getElementsByType<Step>("step");
		if (steps.length === 0) return 0;
		const numbers = steps
			.map((s) => s.data.number)
			.filter((n) => n !== "" && !isNaN(parseInt(n + "")))
			.map((n) => parseInt(n + ""));
		const maxNumber = Math.max(...numbers, 0);
		return maxNumber + 1;
	}

	/**
	 * Checks if the step has a predecessor element (no orphan step)
	 */
	static hasPredecessor(stepId: string, grafcet: Grafcet): boolean {
		const connectionsToStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		return connectionsToStep.length > 0;
	}

	/**
	 * Checks if the step has a successor element (no orphan step)
	 */
	static hasSuccessor(stepId: string, grafcet: Grafcet): boolean {
		const connectionsFromStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_SOURCE_SUCCESSOR,
		);
		return connectionsFromStep.length > 0;
	}

	/**
	 * Returns the actions linked directly to the step, without the ones chained after them.
	 */
	static getDirectActions(stepId: string, grafcet: Grafcet): Action[] {
		const connectionsFromStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_SOURCE_ACTION,
		);
		const actions: Action[] = [];
		for (const connection of connectionsFromStep) {
			if (connection.target.type !== "action") {
				throw new Error(
					`Unexpected target type ${connection.target.type} on handle ${STEP_HANDLE_SOURCE_ACTION} of step ${stepId}`,
				);
			}
			const action = grafcet.getElementByIdAndType<Action>(
				connection.target.id,
				"action",
			);
			if (action) actions.push(action);
		}
		return actions;
	}

	/**
	 * Returns the actions that are activated by the step: the ones linked directly to it, each
	 * followed by the actions chained after it.
	 */
	static getActions(stepId: string, grafcet: Grafcet): Action[] {
		return StepHelper.getDirectActions(stepId, grafcet).flatMap((action) => [
			action,
			...ActionHelper.getChainFrom(action.id, grafcet),
		]);
	}

	private static getRightmostAction(
		stepId: string,
		grafcet: Grafcet,
	): Action | undefined {
		const actions = StepHelper.getActions(stepId, grafcet);
		if (actions.length === 0) return undefined;
		return actions.reduce((a, b) =>
			b.position.x + b.size.width > a.position.x + a.size.width ? b : a,
		);
	}

	/**
	 * Where a new action of the step goes: to the right of the step when it has none, otherwise
	 * flush against the right of its rightmost action, on the same line.
	 */
	static getNextActionPosition(stepId: string, grafcet: Grafcet): XYPosition {
		const step = grafcet.getElementById(stepId)!;
		const rightmost = StepHelper.getRightmostAction(stepId, grafcet);
		if (!rightmost)
			return {
				x: step.position.x + STEP_FIRST_ACTION_OFFSET_X,
				y: step.position.y,
			};
		return {
			x: rightmost.position.x + rightmost.size.width,
			y: rightmost.position.y,
		};
	}

	/**
	 * Source of the link of a new action of the step: the step itself when it has no action,
	 * otherwise the last action of the chain of its rightmost action.
	 */
	static getNextActionLinkSource(
		stepId: string,
		grafcet: Grafcet,
	): ConnectionSide {
		const rightmost = StepHelper.getRightmostAction(stepId, grafcet);
		if (!rightmost)
			return { type: "step", id: stepId, handle: STEP_HANDLE_SOURCE_ACTION };
		const last =
			ActionHelper.getChainFrom(rightmost.id, grafcet).at(-1) ?? rightmost;
		return { type: "action", id: last.id, handle: ACTION_HANDLE_SOURCE_NEXT };
	}

	/**
	 * Returns the step referrals (targets) that lead directly to the step.
	 */
	static getPredecessorReferrals(
		stepId: string,
		grafcet: Grafcet,
	): StepReferralTarget[] {
		return grafcet
			.getConnectionsByElementIdAndHandle(
				stepId,
				STEP_HANDLE_TARGET_PREDECESSOR,
			)
			.filter((connection) => connection.source.type === "step-referral-target")
			.map((connection) =>
				grafcet.getElementByIdAndType<StepReferralTarget>(
					connection.source.id,
					"step-referral-target",
				),
			)
			.filter((referral): referral is StepReferralTarget => !!referral);
	}
}
