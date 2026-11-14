import buildTourSteps from "./build-tour-steps";

describe("buildTourSteps", () => {
	it("builds one step per id, in order, with the texts under the prefix", () => {
		const t = jest.fn((key: string) => `[${key}]`);

		const steps = buildTourSteps(
			["toolbar", "canvas"],
			"editors.grafcet.steps",
			t as never,
		);

		expect(steps).toEqual([
			{
				id: "toolbar",
				title: "[editors.grafcet.steps.toolbar.title]",
				description: "[editors.grafcet.steps.toolbar.description]",
			},
			{
				id: "canvas",
				title: "[editors.grafcet.steps.canvas.title]",
				description: "[editors.grafcet.steps.canvas.description]",
			},
		]);
	});

	it("builds no step without ids", () => {
		expect(buildTourSteps([], "steps", jest.fn() as never)).toEqual([]);
	});
});
