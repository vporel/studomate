import { Dimensions, XYPosition } from "../shared-types";
import Step, { StepData } from "../step.schema";

export default class StepBuilder {
	private _id: string;
	private _data: StepData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		this._data = {
			number: "",
			initial: false,
		};
		this._position = { x: 0, y: 0 };
		this._size = { ...Step.DEFAULT_DIMENSIONS };
	}

	id(id: string): StepBuilder {
		this._id = id;
		return this;
	}

	number(number: number | ""): StepBuilder {
		this._data.number = number;
		return this;
	}

	initial(isInitial: boolean = true): StepBuilder {
		this._data.initial = isInitial;
		return this;
	}

	dimensions(width: number, height: number): StepBuilder {
		this._size = { width, height };
		return this;
	}

	position(x: number, y: number): StepBuilder {
		this._position = { x, y };
		return this;
	}

	build(): Step {
		return new Step(this._id, { ...this._data }, { ...this._position }, { ...this._size });
	}
}
