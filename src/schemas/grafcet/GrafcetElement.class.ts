import { XYPosition } from "./shared-types";

//Export a constant of list of all the element types. This is used to avoid typos and have a single source of truth for the element types.
export const GRAFCET_ELEMENT_TYPES = [
	"step",
	"transition",
	"action",
	"step-referral-source",
	"step-referral-target",
	"junction-and-start",
	"junction-and-end",
	"junction-or-start",
	"junction-or-end",
	"comment",
] as const;

export type GrafcetElementType = (typeof GRAFCET_ELEMENT_TYPES)[number];

export type BaseData = {
	width: number;
	height: number;
};

export default abstract class GrafcetElement<DataType extends BaseData> {
	id: string = "";
	type: GrafcetElementType;
	data: DataType;
	position: XYPosition = { x: 0, y: 0 };

	constructor(id: string, type: GrafcetElementType, data: DataType, position: XYPosition) {
		this.id = id;
		this.type = type;
		this.data = data;
		this.position = position;
	}
	/**
	 * @throws GrafcetElementValidationError if the data are not valid
	 */

	updateData(newData: Partial<DataType>): void {
		this.data = structuredClone({ ...this.data, ...newData });
		this.validateData();
	}

	/**
	 * @throws GrafcetElementValidationError if the data are not valid
	 */
	abstract validateData(): void;

	abstract copy(): GrafcetElement<DataType>;
}
