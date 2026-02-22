import ElementValidationError from "./errors/ElementValidationError";
import { XYPosition } from "./shared-types";
import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralSourceData = StepReferralData & {
	targetStepNumber: number | "";
};

export default class StepReferralSource extends StepReferral<StepReferralSourceData> {
	static generateDefaultData(): StepReferralSourceData {
		return {
			targetStepNumber: "",
			width: StepReferralSource.DEFAULT_DIMENSIONS.width,
			height: StepReferralSource.DEFAULT_DIMENSIONS.height,
		};
	}

	validateData(): void {
		const erros: string[] = [];
		if (this.data.targetStepNumber === "") return; //The field can be empty because the user can create the link before choosing the target step
		if (
			isNaN(parseInt(this.data.targetStepNumber + "")) ||
			parseInt(this.data.targetStepNumber + "") < 0
		) {
			erros.push("Le numéro de l'étape doit être un nombre entier positif.");
		}
		if (erros.length > 0) {
			throw new ElementValidationError(this.id, erros);
		}
	}

	constructor(id: string, data: StepReferralSourceData, position: XYPosition) {
		super(id, "step-referral-source", data, position);
	}

	copy(): StepReferralSource {
		return new StepReferralSource(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralSource {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralSource("", { ...StepReferralSource.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
