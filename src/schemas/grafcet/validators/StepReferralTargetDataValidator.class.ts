import Grafcet from "../Grafcet.class";
import StepReferralTarget, { StepReferralTargetData } from "../StepReferralTarget.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { ElementValidateDataOptions } from "./types";

export default class StepReferralTargetDataValidator extends ElementDataValidator<StepReferralTargetData> {
	validateData(
		elementId: string,
		data: StepReferralTargetData,
		grafcet: Grafcet,
		options: ElementValidateDataOptions,
	): string[] {
		const element = grafcet.getElementByIdAndType<StepReferralTarget>(elementId, "step-referral-target");
		if (!element)
			throw new Error(
				`Element of type "step-referral-target" with id ${elementId} not found in grafcet`,
			);
		const errors: string[] = [];
		const allElements = grafcet.getAllElements();
		if (data.sourceStepNumber !== undefined && data.sourceStepNumber === "") {
			//The field can be empty because the user can create the link before choosing the source step
			if (isNaN(parseInt(data.sourceStepNumber + "")) || parseInt(data.sourceStepNumber + "") < 0) {
				errors.push("Le numéro de l'étape doit être un nombre entier positif.");
				return errors;
			} else {
				if (!allElements.some((n) => n.type === "step" && n.data.number === data.sourceStepNumber)) {
					errors.push("Le numéro de l'étape source n'existe pas");
				}
			}
		}
		return errors;
	}
}
