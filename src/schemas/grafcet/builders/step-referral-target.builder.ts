import { Dimensions, XYPosition } from "../shared-types";
import StepReferralTarget, { StepReferralTargetData } from "../step-referral-target.schema";

export default class StepReferralTargetBuilder {
	private _id: string;
	private _data: StepReferralTargetData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		this._data = {
			sourceStepNumber: "",
		};
		this._position = { x: 0, y: 0 };
		this._size = { ...StepReferralTarget.DEFAULT_DIMENSIONS };
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
		this._size = { width, height };
		return this;
	}

	position(x: number, y: number): StepReferralTargetBuilder {
		this._position = { x, y };
		return this;
	}

	build(): StepReferralTarget {
		return new StepReferralTarget(this._id, { ...this._data }, { ...this._position }, { ...this._size });
	}
}
