import Junction, { JunctionData } from "./Junction.class";
import { XYPosition } from "./shared-types";

export default class JunctionOrEnd extends Junction {
	constructor(id: string, data: JunctionData, position: XYPosition) {
		super(id, "junction-or-end", data, position);
	}

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
