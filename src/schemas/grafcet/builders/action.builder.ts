import Action, { ActionData, ActionExecutionMode, ActionType } from "../action.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class ActionBuilder {
	private _id: string;
	private _data: ActionData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		this._data = {
			expression: "",
			type: ActionType.TEXT,
			executionMode: null,
		};
		this._position = { x: 0, y: 0 };
		this._size = { ...Action.DEFAULT_DIMENSIONS };
	}

	id(id: string): ActionBuilder {
		this._id = id;
		return this;
	}

	expression(expression: string): ActionBuilder {
		this._data.expression = expression;
		return this;
	}

	type(type: ActionType): ActionBuilder {
		this._data.type = type;
		return this;
	}

	executionMode(mode: ActionExecutionMode | null): ActionBuilder {
		this._data.executionMode = mode;
		return this;
	}

	dimensions(width: number, height: number): ActionBuilder {
		this._size = { width, height };
		return this;
	}

	position(x: number, y: number): ActionBuilder {
		this._position = { x, y };
		return this;
	}

	build(): Action {
		return new Action(this._id, { ...this._data }, { ...this._position }, { ...this._size });
	}
}
