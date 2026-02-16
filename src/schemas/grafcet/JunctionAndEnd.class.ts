import Junction from "./junction.class";

export default class JunctionAndEnd extends Junction {
	copy(): JunctionAndEnd {
		return new JunctionAndEnd(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): JunctionAndEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionAndEnd("", { ...Junction.DEFAULT_DATA }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
