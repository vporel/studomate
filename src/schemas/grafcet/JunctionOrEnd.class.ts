import Junction from "./junction.class";

export default class JunctionOrEnd extends Junction {
	copy(): JunctionOrEnd {
		return new JunctionOrEnd(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): JunctionOrEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new JunctionOrEnd("", { ...Junction.DEFAULT_DATA }, { x: 0, y: 0 }), jsonParsed);
	}
}
