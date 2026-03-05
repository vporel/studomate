import { ElementType } from "./element.schema";

export type ConnectionSide = { type: ElementType; id: string; handle: string };
export type ConnectionData = { points: [number, number][] };
export type HandleType = "source" | "target";

export default class Connection {
	id: string;
	source: ConnectionSide;
	target: ConnectionSide;
	data: ConnectionData;

	constructor(id: string, source: ConnectionSide, target: ConnectionSide, data: ConnectionData) {
		this.id = id;
		this.source = source;
		this.target = target;
		this.data = data;
	}

	copy(): Connection {
		return new Connection(
			this.id,
			{ ...this.source },
			{ ...this.target },
			{ points: this.data?.points ? this.data.points.map((p) => [p[0], p[1]]) : [] },
		);
	}

	static createFromJSON(json: string): Connection {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new Connection(
				"",
				{ type: "step", id: "", handle: "" },
				{ type: "step", id: "", handle: "" },
				{ points: [] },
			),
			jsonParsed,
		);
	}
}
