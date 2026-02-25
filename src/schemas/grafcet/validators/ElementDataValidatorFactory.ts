import { GrafcetElementType } from "../GrafcetElement.class";
import ActionDataValidator from "./ActionDataValidator.class";
import DefaultElementDataValidator from "./DefaultElementDataValidator.class";
import ElementDataValidator from "./ElementDataValidator.class";
import StepDataValidator from "./StepDataValidator.class";
import StepReferralSourceDataValidator from "./StepReferralSourceDataValidator.class";
import StepReferralTargetDataValidator from "./StepReferralTargetDataValidator.class";
import TransitionDataValidator from "./TransitionDataValidator.class";

export default class ElementDataValidatorFactory {
	private static validators: Record<GrafcetElementType, ElementDataValidator<any>> = {
		action: new ActionDataValidator(),
		comment: new DefaultElementDataValidator("comment"),
		"junction-and-end": new DefaultElementDataValidator("junction-and-end"),
		"junction-and-start": new DefaultElementDataValidator("junction-and-start"),
		"junction-or-end": new DefaultElementDataValidator("junction-or-end"),
		"junction-or-start": new DefaultElementDataValidator("junction-or-start"),
		step: new StepDataValidator(),
		"step-referral-source": new StepReferralSourceDataValidator(),
		"step-referral-target": new StepReferralTargetDataValidator(),
		transition: new TransitionDataValidator(),
	};

	static getValidatorForElementType(elementType: GrafcetElementType): ElementDataValidator<any> {
		const validator = this.validators[elementType as GrafcetElementType];
		if (!validator) {
			throw new Error(`No validator found for element type ${elementType}`);
		}
		return validator;
	}
}
