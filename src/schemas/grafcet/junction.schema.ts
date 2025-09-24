import GrafcetElement, {
	GrafcetElementDimensions,
	GrafcetElementPosition,
} from "./grafcet-element.schema";

export type JunctionData = {
	width: number;
	pivotPosition: number;
	branchesPositions: number[]; //In pixels from the left of the node
};

export default class Junction extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 200,
		height: 30,
	};

	static defaultData: JunctionData = {
		width: Junction.defaultDimensions.width,
		pivotPosition: Junction.defaultDimensions.width / 2,
		branchesPositions: [10, 190],
	};

	data: JunctionData = Junction.defaultData;

	constructor(
		id: string,
		data: JunctionData,
		position: GrafcetElementPosition
	) {
		super(id, position);
		this.id = id;
		this.data = data;
	}
}
