import { Dimensions, XYPosition } from "../shared-types";
import StepReferralSource, {
	StepReferralSourceData,
} from "../step-referral-source.schema";

export default class StepReferralSourceBuilder {
	private _id: string;
	private _data: StepReferralSourceData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		this._data = {
			targetStepNumber: "",
		};
		this._position = { x: 0, y: 0 };
		this._size = { ...StepReferralSource.DEFAULT_DIMENSIONS };
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
		this._size = { width, height };
		return this;
	}

	position(x: number, y: number): StepReferralSourceBuilder {
		this._position = { x, y };
		return this;
	}

	build(): StepReferralSource {
		return new StepReferralSource(
			this._id,
			{ ...this._data },
			{ ...this._position },
			{ ...this._size },
		);
	}
}
