import { ElementType } from "./element.schema";
import Junction, { JUNCTION_HANDLE_PIVOT, JunctionData, JunctionHandle } from "./junction.schema";
import { XYPosition } from "./shared-types";

export const JUNCTION_AND_END_HANDLE_PIVOT_TYPES = ["transition"] as const satisfies readonly ElementType[];

export type JunctionAndEndHandlePivotType = (typeof JUNCTION_AND_END_HANDLE_PIVOT_TYPES)[number];

export const JUNCTION_AND_END_HANDLES_TO_TYPES: Record<JunctionHandle, readonly ElementType[]> = {
	[JUNCTION_HANDLE_PIVOT]: JUNCTION_AND_END_HANDLE_PIVOT_TYPES,
};

/**
 * Special case for branches handles
 * We don't have a handle name "branch", because the user can add many branches
 * So, for each branch, we will create a specific unpredictable id
 * Nevertheless, we specify here the element types that can be connected to these branch handles
 */
export const JUNCTION_AND_END_HANDLE_BRANCH_TYPES = ["step"] as const satisfies readonly ElementType[];

export default class JunctionAndEnd extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-and-end", data, position);
	}

	copy(): JunctionAndEnd {
		return JunctionAndEnd.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionAndEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionAndEnd("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
