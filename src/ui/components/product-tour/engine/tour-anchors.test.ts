/**
 * @jest-environment jsdom
 */
import { selectAvailableSteps, tourAnchorSelector } from "./tour-anchors";

describe("selectAvailableSteps", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("keeps only the steps whose anchor is in the DOM, in the given order", () => {
		document.body.innerHTML =
			'<div data-tour="pages"></div><div data-tour="menubar"></div>';
		const steps = [{ id: "menubar" }, { id: "explorer" }, { id: "pages" }];

		expect(selectAvailableSteps(steps, document)).toEqual([
			{ id: "menubar" },
			{ id: "pages" },
		]);
	});

	it("returns nothing when no anchor is mounted", () => {
		expect(selectAvailableSteps([{ id: "menubar" }], document)).toEqual([]);
	});

	it("builds the selector from the step id", () => {
		expect(tourAnchorSelector("hmiPages")).toBe('[data-tour="hmiPages"]');
	});

	it("prefixes the selector with the scope when given", () => {
		expect(tourAnchorSelector("canvas", '[id="page-a"]')).toBe(
			'[id="page-a"] [data-tour="canvas"]',
		);
	});
});
