import Junction, { JunctionData } from "./Junction.class";
import { XYPosition } from "./shared-types";

export default class JunctionAndEnd extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-and-end", data, position);
	}

	validateData(): void {}

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
