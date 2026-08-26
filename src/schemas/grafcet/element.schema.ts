import { XYPosition } from "./shared-types";
import SharedElement from "../shared/element.schema";

export const GRAFCET_STEP_TYPE = "step";
export const GRAFCET_TRANSITION_TYPE = "transition";
export const GRAFCET_ACTION_TYPE = "action";
export const GRAFCET_STEP_REFERRAL_SOURCE_TYPE = "step-referral-source";
export const GRAFCET_STEP_REFERRAL_TARGET_TYPE = "step-referral-target";
export const GRAFCET_JUNCTION_AND_START_TYPE = "junction-and-start";
export const GRAFCET_JUNCTION_AND_END_TYPE = "junction-and-end";
export const GRAFCET_JUNCTION_OR_START_TYPE = "junction-or-start";
export const GRAFCET_JUNCTION_OR_END_TYPE = "junction-or-end";
export const GRAFCET_COMMENT_TYPE = "comment";

export const JUNCTION_TYPES = [
	GRAFCET_JUNCTION_AND_START_TYPE,
	GRAFCET_JUNCTION_AND_END_TYPE,
	GRAFCET_JUNCTION_OR_START_TYPE,
	GRAFCET_JUNCTION_OR_END_TYPE,
] as const;

export type JunctionType = (typeof JUNCTION_TYPES)[number];

//A list of all the element types. This is used to avoid typos and have a single source of truth for the element types.
export const GRAFCET_ELEMENT_TYPES = [
	GRAFCET_STEP_TYPE,
	GRAFCET_TRANSITION_TYPE,
	GRAFCET_ACTION_TYPE,
	GRAFCET_STEP_REFERRAL_SOURCE_TYPE,
	GRAFCET_STEP_REFERRAL_TARGET_TYPE,
	GRAFCET_JUNCTION_AND_START_TYPE,
	GRAFCET_JUNCTION_AND_END_TYPE,
	GRAFCET_JUNCTION_OR_START_TYPE,
	GRAFCET_JUNCTION_OR_END_TYPE,
	GRAFCET_COMMENT_TYPE,
] as const;

export type ElementType = (typeof GRAFCET_ELEMENT_TYPES)[number];

export const GRAFCET_ELEMENT_LABELS: Record<ElementType, string> = {
	step: "Étape",
	transition: "Transition",
	action: "Action",
	"step-referral-source": "Tenant",
	"step-referral-target": "Aboutissant",
	"junction-and-start": "Divergence en ET",
	"junction-and-end": "Convergence en ET",
	"junction-or-start": "Divergence en OU",
	"junction-or-end": "Convergence en OU",
	comment: "Commentaire",
};

import { Dimensions } from "./shared-types";

export interface ElementConstructor<T extends Element<any>> {
	new (id: string, data: any, position: XYPosition, size: Dimensions): T;
	generateDefaultData(extraData?: any): any;
	DEFAULT_DIMENSIONS: Dimensions;
}

export default abstract class Element<DataType> implements SharedElement<ElementType, DataType, XYPosition> {
	id: string = "";
	abstract readonly type: ElementType;
	data: DataType;
	position: XYPosition = { x: 0, y: 0 };
	size: Dimensions;

	constructor(id: string, data: DataType, position: XYPosition, size: Dimensions) {
		this.id = id;
		this.data = data;
		this.position = position;
		this.size = size;
	}

	getLabel(): string {
		return GRAFCET_ELEMENT_LABELS[this.type] || "Label inconnu";
	}

	updateData(newData: Partial<DataType>): void {
		this.data = structuredClone({ ...this.data, ...newData });
	}

	updateSize(newSize: Partial<Dimensions>): void {
		this.size = structuredClone({ ...this.size, ...newSize });
	}

	/**
	 * This method can be used to fix the consistency of the new data before applying it to the element.
	 * For example, if there are some fields that are dependent on each other,
	 * we can automatically update them to keep the data consistent and
	 * avoid leaving the element in an invalid state.
	 * @param newData
	 * @returns
	 */
	fixNewDataConsistency(newData: Partial<DataType>, _oldData: DataType): Partial<DataType> {
		return newData;
	}

	copy(): this {
		return (this.constructor as any).createFromJSON(JSON.stringify(this)) as this;
	}

	static createFromJSON<T extends Element<any>>(
		this: ElementConstructor<T>,
		json: string,
	): T {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new this("", { ...this.generateDefaultData() }, { x: 0, y: 0 }, { ...this.DEFAULT_DIMENSIONS }),
			jsonParsed,
		);
	}
}
