import Junction from "./Junction.class";

export default class JunctionAndStart extends Junction {
	copy(): JunctionAndStart {
		return JunctionAndStart.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionAndStart {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionAndStart("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
