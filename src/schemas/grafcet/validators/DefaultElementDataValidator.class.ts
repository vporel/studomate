import Grafcet from "../Grafcet.class";
import { GrafcetElementType } from "../GrafcetElement.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { ElementValidateDataOptions } from "./types";

/**
 * Default validator that doesn't perform any validation and returns an empty array of errors.
 * This can be used for elements that don't require any specific validation logic.
 */
export default class DefaultElementDataValidator extends ElementDataValidator<any> {
	elementType: GrafcetElementType;

	constructor(elementType: GrafcetElementType) {
		super();
		this.elementType = elementType;
	}

	validateData(
		elementId: string,
		data: any,
		grafcet: Grafcet,
		options: ElementValidateDataOptions,
	): string[] {
		const element = grafcet.getElementByIdAndType(elementId, this.elementType);
		if (!element)
			throw new Error(
				`Element of type "${this.elementType}" with id ${elementId} not found in grafcet`,
			);
		return [];
	}
}
