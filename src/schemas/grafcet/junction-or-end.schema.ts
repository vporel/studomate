import { ElementType } from "./element.schema";
import Junction, { JUNCTION_HANDLE_PIVOT, JunctionData, JunctionHandle } from "./junction.schema";
import { XYPosition } from "./shared-types";

export const JUNCTION_OR_END_HANDLE_PIVOT_TYPES = [
	"step",
	"step-referral-source",
] as const satisfies readonly ElementType[];

export const JUNCTION_OR_END_HANDLES_TO_TYPES: Record<JunctionHandle, readonly ElementType[]> = {
	[JUNCTION_HANDLE_PIVOT]: JUNCTION_OR_END_HANDLE_PIVOT_TYPES,
};

/**
 * Special case for branches handles
 * We don't have a handle name "branch", because the user can add many branches
 * So, for each branch, we will create a specific unpredictable id
 * Nevertheless, we specify here the element types that can be connected to these branch handles
 */
export const JUNCTION_OR_END_HANDLE_BRANCH_TYPES = ["transition"] as const satisfies readonly ElementType[];

export default class JunctionOrEnd extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-or-end", data, position);
	}

	copy(): JunctionOrEnd {
		return JunctionOrEnd.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionOrEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionOrEnd("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
