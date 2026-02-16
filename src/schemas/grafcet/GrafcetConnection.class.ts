import { GrafcetElementType } from "./GrafcetElement.class";

export type GrafcetConnectionIdentifier = { type: GrafcetElementType; id: string; handleId: string };
export type GrafcetConnectionData = { points: [number, number][] };

export default class GrafcetConnection {
	id: string;
	source: GrafcetConnectionIdentifier;
	target: GrafcetConnectionIdentifier;
	data: GrafcetConnectionData;

	constructor(
		id: string,
		source: GrafcetConnectionIdentifier,
		target: GrafcetConnectionIdentifier,
		data: GrafcetConnectionData,
	) {
		this.id = id;
		this.source = source;
		this.target = target;
		this.data = data;
	}

	copy(): GrafcetConnection {
		return new GrafcetConnection(
			this.id,
			{ ...this.source },
			{ ...this.target },
			{ points: this.data?.points ? this.data.points.map((p) => [p[0], p[1]]) : [] },
		);
	}

	static createFromJSON(json: string): GrafcetConnection {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new GrafcetConnection(
				"",
				{ type: "step", id: "", handleId: "" },
				{ type: "step", id: "", handleId: "" },
				{ points: [] },
			),
			jsonParsed,
		);
	}
}
