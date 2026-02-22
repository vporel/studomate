import ElementValidationError from "../errors/ElementValidationError";
import Grafcet from "../Grafcet.class";

export default class GrafcetElementsValidator {
	static validateNewData(elementId: string, newData: any, grafcet: Grafcet): string[] {
		const errors: string[] = [];
		const allElements = grafcet.getAllElements();
		const element = grafcet.getElementById(elementId);
		if (!element) return errors;
		const copiedElement = element.copy();
		//Try to apply the new data to the copied element
		try {
			copiedElement.updateData(newData);
		} catch (e) {
			if (e instanceof ElementValidationError) {
				errors.push(...e.errors);
			} else {
				errors.push("Une erreur inconnue est survenue lors de la validation des données");
			}
		}
		//If the node is a step with initial true, we need to check if there is already another step with initial true
		if (element?.type === "step") {
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
		}
		return errors;
	}
}
