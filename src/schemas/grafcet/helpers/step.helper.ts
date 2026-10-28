import Grafcet from "../grafcet.schema";
import Step, {
	StepData,
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "../step.schema";

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
	 * Returns the actions that are activated by the step
	 */
	static getActions(stepId: string, grafcet: Grafcet) {
		const connectionsFromStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_SOURCE_ACTION,
		);
		const actions = [];
		for (const connection of connectionsFromStep) {
			if (connection.target.type !== "action") {
				throw new Error(
					`Unexpected target type ${connection.target.type} on handle ${STEP_HANDLE_SOURCE_ACTION} of step ${stepId}`,
				);
			}
			const action = grafcet.getElementByIdAndType(
				connection.target.id,
				"action",
			);
			if (action) actions.push(action);
		}
		return actions;
	}
}
