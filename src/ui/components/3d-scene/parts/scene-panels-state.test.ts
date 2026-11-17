import {
	isPanelCollapsedByDefault,
	PANEL_EDGE_MARGIN,
	panelsMaxHeight,
} from "./scene-panels-state";

describe("isPanelCollapsedByDefault", () => {
	it("opens only the first panel when the panels are folded", () => {
		expect(isPanelCollapsedByDefault(true, 0)).toBe(false);
		expect(isPanelCollapsedByDefault(true, 1)).toBe(true);
		expect(isPanelCollapsedByDefault(true, 2)).toBe(true);
	});

	it("opens every panel when the panels are not folded", () => {
		expect(isPanelCollapsedByDefault(false, 0)).toBe(false);
		expect(isPanelCollapsedByDefault(false, 1)).toBe(false);
		expect(isPanelCollapsedByDefault(false, 2)).toBe(false);
	});
});

describe("panelsMaxHeight", () => {
	it("leaves the header and a margin on each side of the box", () => {
		expect(panelsMaxHeight(400, 40)).toBe(400 - 2 * PANEL_EDGE_MARGIN - 40);
	});

	it("never goes under a minimal height, even in a very small scene", () => {
		expect(panelsMaxHeight(50, 40)).toBe(80);
	});
});
