/** @jest-environment jsdom */
import { hasNoSkippedLevel, headingLevels } from "./headings";

describe("headings utils", () => {
	it("lists heading levels in document order", () => {
		document.body.innerHTML = "<h1>a</h1><div><h2>b</h2><h3>c</h3></div><h2>d</h2>";
		expect(headingLevels(document.body)).toEqual([1, 2, 3, 2]);
	});

	it("accepts going up several levels and going down one", () => {
		expect(hasNoSkippedLevel([1, 2, 3, 2, 3, 4, 2])).toBe(true);
	});

	it("rejects a skipped level or a wrong first level", () => {
		expect(hasNoSkippedLevel([1, 3])).toBe(false);
		expect(hasNoSkippedLevel([2, 3])).toBe(false);
		expect(hasNoSkippedLevel([2, 3], 2)).toBe(true);
	});
});
