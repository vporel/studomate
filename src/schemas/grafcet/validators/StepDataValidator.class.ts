import Grafcet from "../Grafcet.class";
import Step, { StepData } from "../Step.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { NeededProjectDataWhenValidatingElement } from "./types";

export default class StepDataValidator extends ElementDataValidator<StepData> {
	validateData(
		elementId: string,
		data: StepData,
		grafcet: Grafcet,
		options: {
			projectData: NeededProjectDataWhenValidatingElement;
		},
	): string[] {
		const element = grafcet.getElementByIdAndType<Step>(elementId, "step");
		if (!element) throw new Error(`Element of type "step" with id ${elementId} not found in grafcet`);
		const allElements = grafcet.getAllElements();
		const errors: string[] = [];
		if (data.initial) {
			if (allElements.some((n) => n.type === "step" && n.data.initial && n.id !== elementId)) {
				errors.push("Une autre étape est déjà initiale");
			}
		}
		if (data.number !== undefined) {
			if (data.number === "") {
				errors.push("Le numéro de l'étape ne peut pas être vide.");
			} else if (isNaN(parseInt(data.number + "")) || parseInt(data.number + "") < 0) {
				errors.push("Le numéro de l'étape doit être un nombre entier positif.");
			} else {
				//We need to check is the number is not already used by another step
				if (
					allElements.some(
						(n) => n.type === "step" && n.data.number === data.number && n.id !== elementId,
					)
				) {
					errors.push("Une autre étape utilise déjà ce numéro");
				}
			}
		}
		return errors;
	}
}
