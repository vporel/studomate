import EDITOR_TOUR_STEP_BUILDERS, {
	isEditorTourKind,
} from "./editor-tour-step-builders";

describe("editor tour step builders", () => {
	it("declares a builder for each editor", () => {
		expect(Object.keys(EDITOR_TOUR_STEP_BUILDERS).sort()).toEqual([
			"grafcet",
			"hmi",
			"ladder",
		]);
	});

	it.each([
		["grafcet", ["toolbar", "canvas"]],
		["ladder", ["toolbar", "systemBlocks", "addSection", "canvas"]],
		["hmi", ["toolbar", "canvas", "properties"]],
	] as const)(
		"builds the %s steps in display order, with the texts of that editor",
		(kind, ids) => {
			const t = jest.fn((key: string) => `[${key}]`);

			const steps = EDITOR_TOUR_STEP_BUILDERS[kind](t as never);

			expect(steps.map((step) => step.id)).toEqual(ids);
			expect(steps[0]).toEqual({
				id: ids[0],
				title: `[editors.${kind}.steps.${ids[0]}.title]`,
				description: `[editors.${kind}.steps.${ids[0]}.description]`,
			});
		},
	);

	it("recognises the editor page types only", () => {
		expect(isEditorTourKind("grafcet")).toBe(true);
		expect(isEditorTourKind("ladder")).toBe(true);
		expect(isEditorTourKind("hmi")).toBe(true);
		expect(isEditorTourKind("variables")).toBe(false);
		expect(isEditorTourKind("hmi-simulation")).toBe(false);
		expect(isEditorTourKind("toString")).toBe(false);
		expect(isEditorTourKind(undefined)).toBe(false);
	});
});
