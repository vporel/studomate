import Grafcet from "../Grafcet.class";
import StepReferralSource, { StepReferralSourceData } from "../StepReferralSource.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { NeededProjectDataWhenValidatingElement } from "./types";

export default class StepReferralSourceDataValidator extends ElementDataValidator<StepReferralSourceData> {
	validateData(
		elementId: string,
		data: StepReferralSourceData,
		grafcet: Grafcet,
		options: {
			projectData: NeededProjectDataWhenValidatingElement;
		},
	): string[] {
		const element = grafcet.getElementByIdAndType<StepReferralSource>(elementId, "step-referral-source");
		if (!element)
			throw new Error(
				`Element of type "step-referral-source" with id ${elementId} not found in grafcet`,
			);
		const allElements = grafcet.getAllElements();
		const errors: string[] = [];
		if (data.targetStepNumber !== undefined && data.targetStepNumber !== "") {
			//The field can be empty because the user can create the link before choosing the target step
			if (isNaN(parseInt(data.targetStepNumber + "")) || parseInt(data.targetStepNumber + "") < 0) {
				errors.push("Le numéro de l'étape doit être un nombre entier positif.");
				return errors;
			}
			if (!allElements.some((n) => n.type === "step" && n.data.number === data.targetStepNumber)) {
				errors.push("Le numéro de l'étape cible n'existe pas");
			}
		}
		return errors;
	}
}
