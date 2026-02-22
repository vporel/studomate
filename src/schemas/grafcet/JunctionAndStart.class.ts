import Junction, { JunctionData } from "./Junction.class";
import { XYPosition } from "./shared-types";

export default class JunctionAndStart extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-and-start", data, position);
	}

	validateData(): void {}

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
