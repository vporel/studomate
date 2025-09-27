import { GrafcetElementType } from "./GrafcetElement.class";

export default class GrafcetConnection {
	id: string;
	from: { type: GrafcetElementType; id: string };
	to: { type: GrafcetElementType; id: string };
	data: { points: [number, number][] };

	constructor(
		id: string,
		from: { type: GrafcetElementType; id: string },
		to: { type: GrafcetElementType; id: string },
		data: { points: [number, number][] }
	) {
		this.id = id;
		this.from = from;
		this.to = to;
		this.data = data;
	}
}
