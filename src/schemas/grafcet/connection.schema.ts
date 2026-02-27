import { ElementType } from "./element.schema";

export type ConnectionIdentifier = { type: ElementType; id: string; handleId: string };
export type ConnectionData = { points: [number, number][] };

export default class Connection {
	id: string;
	source: ConnectionIdentifier;
	target: ConnectionIdentifier;
	data: ConnectionData;

	constructor(
		id: string,
		source: ConnectionIdentifier,
		target: ConnectionIdentifier,
		data: ConnectionData,
	) {
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
				{ type: "step", id: "", handleId: "" },
				{ type: "step", id: "", handleId: "" },
				{ points: [] },
			),
			jsonParsed,
		);
	}
}
