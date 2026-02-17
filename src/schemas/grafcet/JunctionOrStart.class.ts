import Junction from "./Junction.class";

export default class JunctionOrStart extends Junction {
	copy(): JunctionOrStart {
		return JunctionOrStart.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): JunctionOrStart {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new JunctionOrStart("", { ...Junction.generateDefaultDataWithEmptyBranches() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
