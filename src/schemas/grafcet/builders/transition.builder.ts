import { XYPosition } from "../shared-types";
import Transition, { TransitionData } from "../transition.schema";

export default class TransitionBuilder {
	private _id: string;
	private _data: TransitionData;
	private _position: XYPosition;

	constructor() {
		this._id = "";
		this._data = {
			expression: "",
			width: Transition.DEFAULT_DIMENSIONS.width,
			height: Transition.DEFAULT_DIMENSIONS.height,
		};
		this._position = { x: 0, y: 0 };
	}

	id(id: string): TransitionBuilder {
		this._id = id;
		return this;
	}

	expression(expression: string): TransitionBuilder {
		this._data.expression = expression;
		return this;
	}

	dimensions(width: number, height: number): TransitionBuilder {
		this._data.width = width;
		this._data.height = height;
		return this;
	}

	position(x: number, y: number): TransitionBuilder {
		this._position = { x, y };
		return this;
	}

	build(): Transition {
		return new Transition(this._id, { ...this._data }, { ...this._position });
	}
}
