import { GrafcetElementPosition } from "./grafcet-element.schema";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export type StepReferralSourceData = StepReferralData & {
	targetStepNumber: number | "";
};

export default class StepReferralSource extends StepReferral {
	static defaultData: StepReferralSourceData = {
		targetStepNumber: "",
	};

	data: StepReferralSourceData = StepReferralSource.defaultData;

	constructor(
		id: string,
		data: StepReferralSourceData,
		position: GrafcetElementPosition
	) {
		super(id, position);
		this.data = data;
	}
}
