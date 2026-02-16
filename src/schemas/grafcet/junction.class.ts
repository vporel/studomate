import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type JunctionData = {
	width: number;
	pivotPosition: number;
	branchesPositions: number[]; //In pixels from the left of the node
};

export default abstract class Junction extends GrafcetElement<JunctionData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 200,
		height: 30,
	};

	static DEFAULT_DATA: JunctionData = {
		width: Junction.DEFAULT_DIMENSIONS.width,
		pivotPosition: Junction.DEFAULT_DIMENSIONS.width / 2,
		branchesPositions: [10, 190],
	};
}
