import Grafcet from "../grafcet.schema";
import Step from "../step.schema";

export default class StepsHelper {
	/**
	 * Get the next available number for a step in the grafcet
	 * It will return the number after the max number used by the steps in the grafcet
	 * @param grafcet
	 * @returns
	 */
	static getNextAvailableNumber(grafcet: Grafcet): number {
		const steps = grafcet.getElementsByType<Step>("step");
		if (steps.length === 0) return 0;
		const numbers = steps
			.map((s) => s.data.number)
			.filter((n) => n !== "" && !isNaN(parseInt(n + "")))
			.map((n) => parseInt(n + ""));
		const maxNumber = Math.max(...numbers, 0);
		return maxNumber + 1;
	}
}
