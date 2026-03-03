import { XYPosition } from "../shared-types";
import StepReferralSource, { StepReferralSourceData } from "../step-referral-source.schema";

export default class StepReferralSourceBuilder {
	private _id: string;
	private _data: StepReferralSourceData;
	private _position: XYPosition;

	constructor() {
		this._id = "";
		this._data = {
			targetStepNumber: "",
			width: 40,
			height: 40,
		};
		this._position = { x: 0, y: 0 };
	}

	id(id: string): StepReferralSourceBuilder {
		this._id = id;
		return this;
	}

	targetStepNumber(stepNumber: number | ""): StepReferralSourceBuilder {
		this._data.targetStepNumber = stepNumber;
		return this;
	}

	dimensions(width: number, height: number): StepReferralSourceBuilder {
		this._data.width = width;
		this._data.height = height;
		return this;
	}

	position(x: number, y: number): StepReferralSourceBuilder {
		this._position = { x, y };
		return this;
	}

	build(): StepReferralSource {
		return new StepReferralSource(this._id, { ...this._data }, { ...this._position });
	}
}
