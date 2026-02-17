import Junction from "./Junction.class";

export default class JunctionOrEnd extends Junction {
	copy(): JunctionOrEnd {
		return JunctionOrEnd.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionOrEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionOrEnd("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
