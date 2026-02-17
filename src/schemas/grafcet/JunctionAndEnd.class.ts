import Junction from "./Junction.class";

export default class JunctionAndEnd extends Junction {
	copy(): JunctionAndEnd {
		return JunctionAndEnd.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionAndEnd {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionAndEnd("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
