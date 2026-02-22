import Junction, { JunctionData } from "./Junction.class";
import { XYPosition } from "./shared-types";

export default class JunctionOrStart extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-or-start", data, position);
	}

	validateData(): void {}

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
