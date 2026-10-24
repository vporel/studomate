import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import resolveEmbeddedViews from "./resolve-embedded-views";

const titles = {
	unavailable: "Unavailable",
	scene3d: "Scene",
};

describe("resolveEmbeddedViews", () => {
	beforeEach(() => ProjectFactory.reset());

	it("turns a grafcet view into a tab titled with the grafcet name", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);

		const [view] = resolveEmbeddedViews(
			project,
			[{ type: "grafcet", id: "g1" }],
			titles,
		);

		expect(view.problem).toBeUndefined();
		expect(view.page).toEqual({
			id: "g1",
			type: "grafcet",
			title: project.getGrafcet("g1")!.name,
		});
	});

	it("keeps the order of the views", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);

		const views = resolveEmbeddedViews(
			project,
			[
				{ type: "grafcet", id: "g2" },
				{ type: "grafcet", id: "g1" },
			],
			titles,
		);

		expect(views.map((v) => v.page.id)).toEqual(["g2", "g1"]);
	});

	it("reports a grafcet missing from the project as an unavailable tab", () => {
		const project = ProjectFactory.createEmpty();

		const [view] = resolveEmbeddedViews(
			project,
			[{ type: "grafcet", id: "nope" }],
			titles,
		);

		expect(view.page).toEqual({
			id: "embedded-unavailable-0",
			type: "embedded-unavailable",
			title: "Unavailable",
		});
		expect(view.problem).toEqual({ reason: "grafcet", id: "nope" });
	});

	it("reports a missing ladder and a missing HMI page", () => {
		const project = ProjectFactory.createEmpty();

		const views = resolveEmbeddedViews(
			project,
			[
				{ type: "ladder", id: "l9" },
				{ type: "hmi", pageId: "h9" },
			],
			titles,
		);

		expect(views.map((v) => v.problem)).toEqual([
			{ reason: "ladder", id: "l9" },
			{ reason: "hmi", id: "h9" },
		]);
		expect(views.map((v) => v.page.id)).toEqual([
			"embedded-unavailable-0",
			"embedded-unavailable-1",
		]);
	});

	it("shows a program asked twice once", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);

		const views = resolveEmbeddedViews(
			project,
			[
				{ type: "grafcet", id: "g1" },
				{ type: "grafcet", id: "g1" },
			],
			titles,
		);

		expect(views).toHaveLength(1);
	});

	it("turns a scene view into a tab when the project has a scene", () => {
		const project = ProjectFactory.createEmpty();
		project.scene3d = {
			sceneId: "carton-sorting",
			sceneVersion: 1,
			bindings: {},
		};

		const [view] = resolveEmbeddedViews(project, [{ type: "scene3d" }], titles);

		expect(view.problem).toBeUndefined();
		expect(view.page).toEqual({
			id: "embedded-scene3d",
			type: "scene3d-view",
			title: "Scene",
		});
	});

	it("reports a scene view on a project without scene", () => {
		const project = ProjectFactory.createEmpty();

		const [view] = resolveEmbeddedViews(project, [{ type: "scene3d" }], titles);

		expect(view.page.type).toBe("embedded-unavailable");
		expect(view.problem).toEqual({ reason: "scene3d" });
	});

	it("turns a variables page of the application into a tab with its own id", () => {
		const project = ProjectFactory.createEmpty();

		const resolved = resolveEmbeddedViews(
			project,
			[
				{ type: "variables", pageId: "input-variables" },
				{ type: "variables", pageId: "output-variables" },
			],
			titles,
		);

		expect(resolved.map(({ page }) => [page.id, page.type])).toEqual([
			["input-variables", "variables"],
			["output-variables", "variables"],
		]);
		expect(resolved.every(({ problem }) => !problem)).toBe(true);
	});

	it("locks the tab of a locked view, whatever its kind", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);
		const hmi = project.createHmiPage("Synoptique");
		const ladder = project.createLadder("Pompe");

		const resolved = resolveEmbeddedViews(
			project,
			[
				{ type: "grafcet", id: "g1", locked: true },
				{ type: "ladder", id: ladder.id, locked: true },
				{ type: "hmi", pageId: hmi.id, locked: true },
				{ type: "variables", pageId: "output-variables", locked: true },
			],
			titles,
		);

		expect(resolved.map(({ page }) => page.locked)).toEqual([
			true,
			true,
			true,
			true,
		]);
	});

	it("leaves a tab unlocked when the view says nothing or locked false", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);

		const resolved = resolveEmbeddedViews(
			project,
			[
				{ type: "grafcet", id: "g1" },
				{ type: "grafcet", id: "g2", locked: false },
			],
			titles,
		);

		expect(resolved.map(({ page }) => page.locked)).toEqual([
			undefined,
			undefined,
		]);
	});

	it("keeps the lock of the first view when a page is asked twice", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);

		const resolved = resolveEmbeddedViews(
			project,
			[
				{ type: "grafcet", id: "g1", locked: true },
				{ type: "grafcet", id: "g1" },
			],
			titles,
		);

		expect(resolved).toHaveLength(1);
		expect(resolved[0].page.locked).toBe(true);
	});

	it("keeps the order of the views, variables pages before the program", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);

		const resolved = resolveEmbeddedViews(
			project,
			[
				{ type: "variables", pageId: "input-variables" },
				{ type: "variables", pageId: "output-variables" },
				{ type: "grafcet", id: "g1" },
			],
			titles,
		);

		expect(resolved.map(({ page }) => page.id)).toEqual([
			"input-variables",
			"output-variables",
			"g1",
		]);
	});
});
