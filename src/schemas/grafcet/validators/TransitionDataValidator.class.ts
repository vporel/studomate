import Grafcet from "../Grafcet.class";
import Transition, { TransitionData } from "../Transition.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { NeededProjectDataWhenValidatingElement } from "./types";

export default class TransitionDataValidator extends ElementDataValidator<TransitionData> {
	validateData(
		elementId: string,
		data: TransitionData,
		grafcet: Grafcet,
		options: {
			projectData: NeededProjectDataWhenValidatingElement;
		},
	): string[] {
		const element = grafcet.getElementByIdAndType<Transition>(elementId, "transition");
		if (!element)
			throw new Error(`Element of type "transition" with id ${elementId} not found in grafcet`);
		const errors: string[] = [];

		return errors;
	}
}
