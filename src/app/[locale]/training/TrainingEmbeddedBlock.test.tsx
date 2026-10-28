/**
 * @jest-environment jsdom
 */
import { getHandoff } from "@/persistence/handoff.storage";
import { render } from "@testing-library/react";
import { stubLocalStorage } from "@tests/utils/local-storage-stub";
import TrainingEmbeddedBlock from "./TrainingEmbeddedBlock";

const mockEmbeddedApp = jest.fn((_props: any) => null);
jest.mock("@/ui/components/embedded/EmbeddedApp", () => ({
	__esModule: true,
	default: (props: any) => mockEmbeddedApp(props),
}));

describe("TrainingEmbeddedBlock", () => {
	beforeEach(() => {
		mockEmbeddedApp.mockClear();
		localStorage.clear();
	});

	it("shows the Main ladder of an exercise that has no grafcet", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="ladder-and-or"
				locale="fr"
				variant="exercise"
			/>,
		);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views.filter((v: any) => v.type === "ladder")).toHaveLength(1);
	});

	it("shows the empty Main ladder of an exercise to be written", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="ladder-logic"
				locale="fr"
				variant="exercise"
				initialView={{ type: "ladder" }}
			/>,
		);
		const { views, initialView } = mockEmbeddedApp.mock.calls[0][0];
		expect(views.filter((v: any) => v.type === "ladder")).toHaveLength(1);
		expect(initialView).toMatchObject({ type: "ladder" });
	});

	it("offers the 3D scene view when asked and the solution has a scene", () => {
		render(<TrainingEmbeddedBlock templateId="parking" locale="fr" scene3d />);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views).toContainEqual({ type: "scene3d" });
		expect(views.filter((v: any) => v.type === "grafcet")).not.toHaveLength(0);
	});

	it("offers no 3D scene view unless asked", () => {
		render(<TrainingEmbeddedBlock templateId="parking" locale="fr" />);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views).not.toContainEqual({ type: "scene3d" });
	});

	it("keeps the watch table closed unless asked", () => {
		render(<TrainingEmbeddedBlock templateId="linear-sequence" locale="fr" />);
		expect(mockEmbeddedApp.mock.calls[0][0].watchOpen).toBe(false);
	});

	it("opens the watch table when asked, whatever the views offered", () => {
		for (const [templateId, extra] of [
			["linear-sequence", {}],
			["parking", { scene3d: true }],
			["traffic-light", {}],
		] as const) {
			mockEmbeddedApp.mockClear();
			render(
				<TrainingEmbeddedBlock
					templateId={templateId}
					locale="fr"
					watchOpen
					{...extra}
				/>,
			);
			expect(mockEmbeddedApp.mock.calls[0][0].watchOpen).toBe(true);
		}
	});

	it("offers no 3D scene view when the solution has none", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence"
				locale="fr"
				scene3d
			/>,
		);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views).not.toContainEqual({ type: "scene3d" });
	});

	it("offers the HMI pages of the solution, before the 3D scene", () => {
		render(<TrainingEmbeddedBlock templateId="traffic-light" locale="fr" />);
		const { views, project } = mockEmbeddedApp.mock.calls[0][0];
		const hmiViews = views.filter((v: any) => v.type === "hmi");
		expect(hmiViews).toEqual(
			Object.keys(project.hmiPages).map((pageId) => ({
				type: "hmi",
				pageId,
				locked: true,
			})),
		);
		expect(hmiViews).not.toHaveLength(0);
	});

	it("offers no HMI view when the solution has no HMI page", () => {
		render(<TrainingEmbeddedBlock templateId="linear-sequence" locale="fr" />);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views.some((v: any) => v.type === "hmi")).toBe(false);
	});

	it("opens a complete project in simulation, read-only, on its Main ladder", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="ladder-and-or"
				locale="fr"
				watchOpen
			/>,
		);
		const props = mockEmbeddedApp.mock.calls[0][0];

		expect(props.initialMode).toBe("simulation");
		expect(props.editable).toBe(false);
		expect(props.watchOpen).toBe(true);
		expect(props.views).toEqual([{ type: "ladder", id: expect.any(String) }]);
	});

	it("keeps the non-empty Main ladder of a project that also draws a grafcet", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence-naive-ladder"
				locale="fr"
				initialView={{ type: "ladder" }}
			/>,
		);
		const { views, initialView } = mockEmbeddedApp.mock.calls[0][0];

		expect(views.filter((v: any) => v.type === "grafcet")).toHaveLength(1);
		expect(views.filter((v: any) => v.type === "ladder")).toHaveLength(1);
		expect(initialView).toMatchObject({ type: "ladder" });
	});

	it("opens the exercise editable, in design mode, with a link to the application that carries its work", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence"
				locale="fr"
				variant="exercise"
			/>,
		);
		const props = mockEmbeddedApp.mock.calls[0][0];
		expect(props.editable).toBe(true);
		expect(props.initialMode).toBe("design");
		expect(props.controls).toContain("history");
		expect(props.controls).toContain("openInApp");
		expect(typeof props.appHref).toBe("function");
		const [grafcet] = Object.values<any>(props.project.grafcets);
		expect(grafcet.isEmpty()).toBe(true);
		expect(props.views).toEqual([
			{ type: "variables", pageId: "input-variables", locked: true },
			{ type: "variables", pageId: "output-variables", locked: true },
			{ type: "grafcet", id: grafcet.id },
		]);
	});

	it("shows only the variables pages the exercise has variables for", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="traffic-light"
				locale="fr"
				variant="exercise"
			/>,
		);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(
			views
				.filter((v: any) => v.type === "variables")
				.map((v: any) => v.pageId),
		).toEqual(["output-variables"]);
		expect(views.some((v: any) => v.type === "hmi")).toBe(true);
	});

	it("freezes what the exercise provides and leaves the program to write editable", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="traffic-light"
				locale="fr"
				variant="exercise"
			/>,
		);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		for (const view of views) {
			if (view.type === "variables" || view.type === "hmi") {
				expect(view.locked).toBe(true);
			} else {
				expect(view.type).toBe("grafcet");
				expect(view.locked).toBeUndefined();
			}
		}
		expect(views.some((v: any) => v.type === "hmi")).toBe(true);
	});

	describe("initialView", () => {
		const firstProps = () => mockEmbeddedApp.mock.calls[0][0];

		it("opens on the first view offered when none is requested", () => {
			render(
				<TrainingEmbeddedBlock
					templateId="linear-sequence"
					locale="fr"
					variant="exercise"
				/>,
			);
			expect(firstProps().initialView).toBeUndefined();
		});

		it("opens on the first view of the requested kind", () => {
			render(
				<TrainingEmbeddedBlock
					templateId="linear-sequence"
					locale="fr"
					variant="exercise"
					initialView={{ type: "grafcet" }}
				/>,
			);
			const [grafcet] = Object.values<any>(firstProps().project.grafcets);
			expect(firstProps().initialView).toEqual({
				type: "grafcet",
				id: grafcet.id,
			});
		});

		it("opens on the Main ladder of an exercise made of networks", () => {
			render(
				<TrainingEmbeddedBlock
					templateId="ladder-and-or"
					locale="fr"
					variant="exercise"
					initialView={{ type: "ladder" }}
				/>,
			);
			expect(firstProps().initialView).toEqual({
				type: "ladder",
				id: expect.any(String),
			});
		});

		it("opens on the requested variables page", () => {
			render(
				<TrainingEmbeddedBlock
					templateId="linear-sequence"
					locale="fr"
					variant="exercise"
					initialView={{ type: "variables", pageId: "output-variables" }}
				/>,
			);
			expect(firstProps().initialView).toEqual({
				type: "variables",
				pageId: "output-variables",
				locked: true,
			});
		});

		it("falls back to the first view offered when the requested one does not exist", () => {
			render(
				<TrainingEmbeddedBlock
					templateId="linear-sequence"
					locale="fr"
					variant="exercise"
					initialView={{ type: "hmi" }}
				/>,
			);
			expect(firstProps().initialView).toBeUndefined();
		});
	});

	it("hands the project over to the application through a token in the link", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence"
				locale="en"
				variant="exercise"
			/>,
		);
		const { project, appHref } = mockEmbeddedApp.mock.calls[0][0];

		const pages = { pagesOrder: ["g1"], activePageId: "g1" };
		const href: string = appHref(project, pages);

		const token = new URL(href, "http://localhost").searchParams.get("handoff");
		expect(token).toBeTruthy();
		const handoff = getHandoff(token!);
		expect(handoff).toMatchObject({
			templateId: "linear-sequence",
			locale: "en",
		});
		expect(handoff!.project.id).toBe(project.id);
		expect(handoff!.pages).toEqual(pages);
	});

	it("falls back to the blank template link when the storage refuses the project", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence"
				locale="fr"
				variant="exercise"
			/>,
		);
		const { project, appHref } = mockEmbeddedApp.mock.calls[0][0];
		const restore = stubLocalStorage({
			setItem: () => {
				throw new Error("full");
			},
		});

		const href: string = appHref(project);
		restore();

		expect(href).toContain("template=linear-sequence");
		expect(href).not.toContain("handoff");
	});

	it("keeps the first view of the exercise when it has no program", () => {
		render(
			<TrainingEmbeddedBlock
				templateId="linear-sequence"
				locale="fr"
				variant="exercise"
			/>,
		);
		expect(mockEmbeddedApp.mock.calls[0][0].initialView).toBeUndefined();
	});

	it("does not choose the first view of the solution", () => {
		render(<TrainingEmbeddedBlock templateId="linear-sequence" locale="fr" />);
		expect(mockEmbeddedApp.mock.calls[0][0].initialView).toBeUndefined();
	});

	it("does not add the variables pages to the solution", () => {
		render(<TrainingEmbeddedBlock templateId="linear-sequence" locale="fr" />);
		const { views } = mockEmbeddedApp.mock.calls[0][0];
		expect(views.some((view: any) => view.type === "variables")).toBe(false);
	});

	it("opens the solution read-only, in simulation", () => {
		render(<TrainingEmbeddedBlock templateId="linear-sequence" locale="fr" />);
		const props = mockEmbeddedApp.mock.calls[0][0];
		expect(props.editable).toBe(false);
		expect(props.initialMode).toBe("simulation");
		expect(props.controls).toContain("openInApp");
		expect(typeof props.appHref).toBe("string");
		expect(Object.keys(props.project.grafcets).length).toBeGreaterThan(0);
	});
});
