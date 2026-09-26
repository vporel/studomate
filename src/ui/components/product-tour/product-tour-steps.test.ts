/**
 * @jest-environment jsdom
 */
import {
	PRODUCT_TOUR_STEP_IDS,
	productTourAnchorSelector,
	selectAvailableSteps,
} from "./product-tour-steps";

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
		expect(productTourAnchorSelector("hmiPages")).toBe('[data-tour="hmiPages"]');
	});

	it("declares the steps in display order", () => {
		expect(PRODUCT_TOUR_STEP_IDS).toEqual([
			"menubar",
			"explorer",
			"pages",
			"hmiPages",
			"simulation",
			"crossReference",
			"analysis",
		]);
	});
});
