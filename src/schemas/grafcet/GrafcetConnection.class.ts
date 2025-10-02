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
		data: GrafcetConnectionData
	) {
		this.id = id;
		this.source = source;
		this.target = target;
		this.data = data;
	}
}
