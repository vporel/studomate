import { createRandomId } from "../utils/ids";
import Element, { BaseData, JunctionType } from "./element.schema";
import { Dimensions } from "./shared-types";

export const JUNCTION_HANDLE_PIVOT = "pivot";

export type JunctionHandle = typeof JUNCTION_HANDLE_PIVOT;

export type JunctionBranch = {
	id: string;
	position: number; //In pixels from the left of the node
};

export type JunctionData = BaseData & {
	pivotPosition: number; //In pixels from the left of the node
	branches: Record<string, JunctionBranch>; //Map of branch id to branch data
	branchesOrder: string[]; //List of branch ids in the order they are displayed (from left to right)
};

export default abstract class Junction extends Element<JunctionData> {
	abstract readonly type: JunctionType;

	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 200,
		height: 30,
	};

	static generateDefaultData(): JunctionData {
		const branch1: JunctionBranch = { id: createRandomId(), position: 10 };
		const branch2: JunctionBranch = { id: createRandomId(), position: 190 };
		return {
			width: Junction.DEFAULT_DIMENSIONS.width,
			height: Junction.DEFAULT_DIMENSIONS.height,
			pivotPosition: Junction.DEFAULT_DIMENSIONS.width / 2,
			branches: { [branch1.id]: branch1, [branch2.id]: branch2 },
			branchesOrder: [branch1.id, branch2.id],
		};
	}

	static generateDefaultDataWithEmptyBranches(): JunctionData {
		return {
			width: Junction.DEFAULT_DIMENSIONS.width,
			height: Junction.DEFAULT_DIMENSIONS.height,
			pivotPosition: Junction.DEFAULT_DIMENSIONS.width / 2,
			branches: {},
			branchesOrder: [],
		};
	}
}
