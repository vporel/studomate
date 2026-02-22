import ElementValidationError from "./errors/ElementValidationError";
import { XYPosition } from "./shared-types";
import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralTargetData = StepReferralData & {
	sourceStepNumber: number | "";
};

export default class StepReferralTarget extends StepReferral<StepReferralTargetData> {
	static generateDefaultData(): StepReferralTargetData {
		return {
			sourceStepNumber: "",
			width: StepReferralTarget.DEFAULT_DIMENSIONS.width,
			height: StepReferralTarget.DEFAULT_DIMENSIONS.height,
		};
	}

	validateData(): void {
		const erros: string[] = [];
		if (this.data.sourceStepNumber === "") return; //The field can be empty because the user can create the link before choosing the source step
		if (
			isNaN(parseInt(this.data.sourceStepNumber + "")) ||
			parseInt(this.data.sourceStepNumber + "") < 0
		) {
			erros.push("Le numéro de l'étape doit être un nombre entier positif.");
		}
		if (erros.length > 0) {
			throw new ElementValidationError(this.id, erros);
		}
	}

	constructor(id: string, data: StepReferralTargetData, position: XYPosition) {
		super(id, "step-referral-target", data, position);
	}

	copy(): StepReferralTarget {
		return new StepReferralTarget(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralTarget {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralTarget("", { ...StepReferralTarget.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
