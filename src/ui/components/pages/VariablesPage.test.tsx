/**
 * @jest-environment jsdom
 */
import { getVariablesPageIdForZone } from "./VariablesPage";

describe("getVariablesPageIdForZone", () => {
	it("mappe les zones d'entrée vers input-variables", () => {
		expect(getVariablesPageIdForZone("logic-input")).toBe("input-variables");
		expect(getVariablesPageIdForZone("analog-input")).toBe("input-variables");
	});

	it("mappe les zones de sortie vers output-variables", () => {
		expect(getVariablesPageIdForZone("logic-output")).toBe("output-variables");
		expect(getVariablesPageIdForZone("analog-output")).toBe("output-variables");
	});

	it("mappe la zone mémoire vers memory-variables", () => {
		expect(getVariablesPageIdForZone("memory")).toBe("memory-variables");
	});
});
