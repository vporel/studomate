import Variable from "../variable/Variable.class";
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

export type ElementProjectDataWhenValidating = {
	variables: Variable[];
};

export type ElementUpdateDataOptions = {
	projectData: ElementProjectDataWhenValidating;
};

export type ElementValidateDataOptions = {
	projectData: ElementProjectDataWhenValidating;
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
	updateData(newData: Partial<DataType>, options?: ElementUpdateDataOptions): void {
		this.data = structuredClone({ ...this.data, ...newData });
		this.validateData(options);
	}

	/**
	 * This method can be used to fix the consistency of the new data before applying it to the element.
	 * For example, if there are some fields that are dependent on each other,
	 * we can automatically update them to keep the data consistent and
	 * avoid leaving the element in an invalid state.
	 * @param newData
	 * @returns
	 */
	fixNewDataConsistency(newData: Partial<DataType>): Partial<DataType> {
		return newData;
	}

	/**
	 * @throws GrafcetElementValidationError if the data are not valid
	 */
	abstract validateData(options?: ElementValidateDataOptions): void;

	abstract copy(): GrafcetElement<DataType>;
}
