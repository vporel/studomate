import Junction from "./junction.class";

export default class JunctionAndStart extends Junction {
	copy(): JunctionAndStart {
		return new JunctionAndStart(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): JunctionAndStart {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionAndStart("", { ...Junction.defaultData }, { x: 0, y: 0 }),
			jsonParsed
		);
	}
}
