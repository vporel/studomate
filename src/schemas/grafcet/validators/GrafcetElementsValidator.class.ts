import ElementValidationError from "../errors/ElementValidationError";
import Grafcet from "../Grafcet.class";
import { ElementProjectDataWhenValidating } from "../GrafcetElement.class";

export default class GrafcetElementsValidator {
	static validateNewData(
		elementId: string,
		newData: any,
		grafcet: Grafcet,
		options: {
			projectData: ElementProjectDataWhenValidating;
		},
	): string[] {
		const errors: string[] = [];
		const allElements = grafcet.getAllElements();
		const element = grafcet.getElementById(elementId);
		if (!element) return errors;
		const copiedElement = element.copy();
		//Try to apply the new data to the copied element
		try {
			copiedElement.updateData(newData, { projectData: options.projectData });
		} catch (e) {
			if (e instanceof ElementValidationError) {
				errors.push(...e.errors);
			} else {
				errors.push("Une erreur inconnue est survenue lors de la validation des données");
			}
		}
		if (element?.type === "step") {
			//we need to check if there is already another step with initial true
			if (newData.initial)
				if (allElements.some((n) => n.type === "step" && n.data.initial && n.id !== elementId)) {
					errors.push("Une autre étape est déjà initiale");
				}
			//We need to check is the number is not already used by another step
			if (newData.number !== undefined)
				if (
					allElements.some(
						(n) => n.type === "step" && n.data.number === newData.number && n.id !== elementId,
					)
				) {
					errors.push("Une autre étape utilise déjà ce numéro");
				}
		} else if (element?.type === "step-referral-source") {
			//We need to check is the target step number exists
			if (newData.targetStepNumber !== undefined)
				if (
					!allElements.some((n) => n.type === "step" && n.data.number === newData.targetStepNumber)
				) {
					errors.push("Le numéro de l'étape cible n'existe pas");
				}
		} else if (element?.type === "step-referral-target") {
			//We need to check is the source step number exists
			if (newData.sourceStepNumber !== undefined)
				if (
					!allElements.some((n) => n.type === "step" && n.data.number === newData.sourceStepNumber)
				) {
					errors.push("Le numéro de l'étape source n'existe pas");
				}
		}
		return errors;
	}
}
