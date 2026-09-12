import { ACTION_HANDLES_TO_TYPES } from "../action.schema";
import Connection, { ConnectionSide } from "../connection.schema";
import Element, { ElementType } from "../element.schema";
import { JUNCTION_AND_END_HANDLES_TO_TYPES } from "../junction-and-end.schema";
import { JUNCTION_AND_START_HANDLES_TO_TYPES } from "../junction-and-start.schema";
import { JUNCTION_OR_END_HANDLES_TO_TYPES } from "../junction-or-end.schema";
import { JUNCTION_OR_START_HANDLES_TO_TYPES } from "../junction-or-start.schema";
import { STEP_REFERRAL_SOURCE_HANDLES_TO_TYPES } from "../step-referral-source.schema";
import { STEP_REFERRAL_TARGET_HANDLES_TO_TYPES } from "../step-referral-target.schema";
import { STEP_HANDLES_TO_TYPES } from "../step.schema";
import { TRANSITION_HANDLES_TO_TYPES } from "../transition.schema";

export const HANDLES_TO_TYPES_MAP: Record<
	ElementType,
	Record<string, readonly ElementType[]> | null
> = {
	action: ACTION_HANDLES_TO_TYPES,
	comment: null,
	"junction-and-start": JUNCTION_AND_START_HANDLES_TO_TYPES,
	"junction-and-end": JUNCTION_AND_END_HANDLES_TO_TYPES,
	"junction-or-start": JUNCTION_OR_START_HANDLES_TO_TYPES,
	"junction-or-end": JUNCTION_OR_END_HANDLES_TO_TYPES,
	step: STEP_HANDLES_TO_TYPES,
	"step-referral-source": STEP_REFERRAL_SOURCE_HANDLES_TO_TYPES,
	"step-referral-target": STEP_REFERRAL_TARGET_HANDLES_TO_TYPES,
	transition: TRANSITION_HANDLES_TO_TYPES,
};

export class ConnectionSideBuilder {
	static build(type: ElementType, id: string, handle: string): ConnectionSide {
		return { type, id, handle };
	}
}

export default class ConnectionBuilder {
	private _id: string;
	private _source: ConnectionSide | null;
	private _target: ConnectionSide | null;
	private _data: { points: [number, number][] };

	constructor() {
		this._id = "";
		this._source = null;
		this._target = null;
		this._data = { points: [] };
	}

	id(id: string): ConnectionBuilder {
		this._id = id;
		return this;
	}

	source(type: ElementType, id: string, handle: string): ConnectionBuilder {
		this._source = ConnectionSideBuilder.build(type, id, handle);
		return this;
	}

	target(type: ElementType, id: string, handle: string): ConnectionBuilder {
		this._target = ConnectionSideBuilder.build(type, id, handle);
		return this;
	}

	data(points: [number, number][]): ConnectionBuilder {
		this._data.points = points;
		return this;
	}

	build(): Connection {
		if (!this._source || !this._target) {
			throw new Error("Source and target must be defined");
		}
		return new Connection(this._id, this._source, this._target, this._data);
	}

	static betweenElements(
		connectionId: string,
		source: Element<any>,
		sourceHandle: string,
		target: Element<any>,
		targetHandle: string,
	): Connection {
		return new ConnectionBuilder()
			.id(connectionId)
			.source(source.type, source.id, sourceHandle)
			.target(target.type, target.id, targetHandle)
			.build();
	}
}
