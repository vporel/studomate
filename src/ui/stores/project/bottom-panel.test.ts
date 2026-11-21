import { getActiveBottomPanelTab, setBottomPanelTabOpen } from "./bottom-panel";

const ui = (
	analysisResultVisible: boolean,
	crossReferenceResultVisible: boolean,
) => ({
	analysisResultVisible,
	crossReferenceResultVisible,
});

describe("getActiveBottomPanelTab", () => {
	it.each([
		[ui(false, false), null],
		[ui(true, false), "analysis"],
		[ui(false, true), "crossReference"],
	] as const)("returns the tab shown", (state, expected) => {
		expect(getActiveBottomPanelTab(state)).toBe(expected);
	});
});

describe("setBottomPanelTabOpen", () => {
	it("opens the panel on a tab", () => {
		expect(
			setBottomPanelTabOpen(ui(false, false), "crossReference", true),
		).toEqual(ui(false, true));
	});

	it("switches from one tab to the other", () => {
		expect(
			setBottomPanelTabOpen(ui(true, false), "crossReference", true),
		).toEqual(ui(false, true));
	});

	it("closes the tab that is shown", () => {
		expect(setBottomPanelTabOpen(ui(true, false), "analysis", false)).toEqual(
			ui(false, false),
		);
	});

	it("leaves the shown tab alone when another one is closed", () => {
		expect(
			setBottomPanelTabOpen(ui(true, false), "crossReference", false),
		).toEqual(ui(true, false));
	});

	it("keeps the other fields of the state", () => {
		const result = setBottomPanelTabOpen(
			{ ...ui(false, false), extra: 1 },
			"analysis",
			true,
		);
		expect(result.extra).toBe(1);
	});
});
