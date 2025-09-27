import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type JunctionData = {
	width: number;
	pivotPosition: number;
	branchesPositions: number[]; //In pixels from the left of the node
};

export default class Junction extends GrafcetElement<JunctionData> {
	static defaultDimensions: Dimensions = {
		width: 200,
		height: 30,
	};

	static defaultData: JunctionData = {
		width: Junction.defaultDimensions.width,
		pivotPosition: Junction.defaultDimensions.width / 2,
		branchesPositions: [10, 190],
	};
}
