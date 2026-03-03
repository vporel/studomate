import { XYPosition } from "../shared-types";
import StepReferralTarget, { StepReferralTargetData } from "../step-referral-target.schema";

export default class StepReferralTargetBuilder {
	private _id: string;
	private _data: StepReferralTargetData;
	private _position: XYPosition;

	constructor() {
		this._id = "";
		this._data = {
			sourceStepNumber: "",
			width: 40,
			height: 40,
		};
		this._position = { x: 0, y: 0 };
	}

	id(id: string): StepReferralTargetBuilder {
		this._id = id;
		return this;
	}

	sourceStepNumber(stepNumber: number | ""): StepReferralTargetBuilder {
		this._data.sourceStepNumber = stepNumber;
		return this;
	}

	dimensions(width: number, height: number): StepReferralTargetBuilder {
		this._data.width = width;
		this._data.height = height;
		return this;
	}

	position(x: number, y: number): StepReferralTargetBuilder {
		this._position = { x, y };
		return this;
	}

	build(): StepReferralTarget {
		return new StepReferralTarget(this._id, { ...this._data }, { ...this._position });
	}
}
