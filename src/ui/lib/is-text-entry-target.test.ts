/**
 * @jest-environment jsdom
 */
import isTextEntryTarget from "./is-text-entry-target";

describe("isTextEntryTarget", () => {
	it("accepts input and textarea", () => {
		expect(isTextEntryTarget(document.createElement("input"))).toBe(true);
		expect(isTextEntryTarget(document.createElement("textarea"))).toBe(true);
	});

	it("rejects other elements, null and undefined", () => {
		expect(isTextEntryTarget(document.createElement("div"))).toBe(false);
		expect(isTextEntryTarget(null)).toBe(false);
		expect(isTextEntryTarget(undefined)).toBe(false);
	});
});
