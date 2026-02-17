import Junction from "./Junction.class";

export default class JunctionOrStart extends Junction {
	copy(): JunctionOrStart {
		return new JunctionOrStart(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): JunctionOrStart {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionOrStart("", { ...Junction.DEFAULT_DATA }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
