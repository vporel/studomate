/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { i18nWrapper } from "@tests/utils/i18n";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import handleEditingShortcut from "../projects/editing-shortcuts";
import EmbeddedApp from "./EmbeddedApp";
import type { EmbeddedAppProps } from "./embedded-app.types";

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;

jest.mock("../projects/editing-shortcuts");
jest.mock("../3d-scene/InlineScene", () => ({
	__esModule: true,
	default: () => <div data-testid="inline-scene" />,
}));

jest.mock("next-intl", () => ({
	...jest.requireActual("next-intl"),
	useLocale: () => "fr",
}));

function renderApp(props: Partial<EmbeddedAppProps> = {}) {
	const project =
		props.project ??
		ProjectFactory.createWithGrafcets([GrafcetFactory.createSimpleCycle("g1")]);
	return render(
		<EmbeddedApp
			project={project}
			views={[{ type: "grafcet", id: "g1" }]}
			{...props}
		/>,
		{ wrapper: i18nWrapper() },
	);
}

describe("EmbeddedApp", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		ProjectFactory.reset();
		jest.mocked(handleEditingShortcut).mockClear();
		jest.mocked(handleEditingShortcut).mockReturnValue(false);
	});
	afterEach(() => jest.useRealTimers());

	it("shows the grafcet of the view", () => {
		const { container } = renderApp();

		expect(container.querySelector("#grafcet-g1")).toBeInTheDocument();
	});

	it("shows no bar when no control is asked for", () => {
		renderApp();

		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Plein écran" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Résultats de l'analyse/ }),
		).not.toBeInTheDocument();
	});

	it("shows the toolbar of the grafcet editor, its tools greyed out and its zoom available on a read-only project", () => {
		const editable = renderApp();
		expect(
			editable.container.querySelector(".grafcet-toolbar__action"),
		).not.toHaveClass("grafcet-toolbar__tool--disabled");
		editable.unmount();

		const readOnly = renderApp({ editable: false });

		expect(readOnly.container.querySelector("#grafcet-g1")).toBeInTheDocument();
		expect(
			readOnly.container.querySelector(".grafcet-toolbar"),
		).toBeInTheDocument();
		expect(
			readOnly.container.querySelector(".grafcet-toolbar__action"),
		).toHaveClass("grafcet-toolbar__tool--disabled");
		expect(
			readOnly.container.querySelector(".app-toolbar__zoom-in"),
		).toBeInTheDocument();
		expect(
			readOnly.container.querySelector(".app-toolbar__zoom-out"),
		).toBeInTheDocument();
	});

	it("hides the connection handles of a grafcet that cannot be edited", () => {
		const editable = renderApp();
		expect(
			editable.container.querySelector(".flow-page--readonly"),
		).not.toBeInTheDocument();
		editable.unmount();

		const readOnly = renderApp({ editable: false });

		expect(readOnly.container.querySelector("#grafcet-g1")).toHaveClass(
			"flow-page--readonly",
		);
	});

	it("shows no tab bar for a single view", () => {
		renderApp();

		expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
	});

	it("shows one tab per view, in order, and switches the displayed page", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);
		const { container } = renderApp({
			project,
			views: [
				{ type: "grafcet", id: "g1" },
				{ type: "grafcet", id: "g2" },
			],
		});

		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(2);
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");

		fireEvent.click(tabs[1]);

		expect(screen.getAllByRole("tab")[1]).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(container.querySelector("#page-g2")).toHaveStyle("display: flex");
		expect(container.querySelector("#page-g1")).toHaveStyle("display: none");
	});

	it("lets a tab shrink below the width of its content", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
		]);
		const { container } = renderApp({
			project,
			views: [{ type: "grafcet", id: "g1" }],
		});

		expect(container.querySelector("#page-g1")).toHaveStyle("min-width: 0");
	});

	it("shows the initial view first, wherever it is among the tabs", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);
		const { container } = renderApp({
			project,
			views: [
				{ type: "grafcet", id: "g1" },
				{ type: "grafcet", id: "g2" },
			],
			initialView: { type: "grafcet", id: "g2" },
		});

		const tabs = screen.getAllByRole("tab");
		expect(tabs[0]).toHaveAttribute("aria-selected", "false");
		expect(tabs[1]).toHaveAttribute("aria-selected", "true");
		expect(container.querySelector("#page-g2")).toHaveStyle("display: flex");
		expect(container.querySelector("#page-g1")).toHaveStyle("display: none");
	});

	it("shows the first view when the initial view points at nothing", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);
		renderApp({
			project,
			views: [
				{ type: "grafcet", id: "g1" },
				{ type: "grafcet", id: "g2" },
			],
			initialView: { type: "grafcet", id: "nope" },
		});

		expect(screen.getAllByRole("tab")[0]).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getAllByRole("tab")).toHaveLength(2);
	});

	it("explains a view that points at nothing, without failing", () => {
		renderApp({ views: [{ type: "grafcet", id: "nope" }] });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Le grafcet « nope » n'existe pas dans ce projet.",
		);
	});

	it("explains a ladder and a page missing from the project", () => {
		renderApp({
			views: [
				{ type: "ladder", id: "l9" },
				{ type: "hmi", pageId: "h9" },
			],
		});

		const alerts = screen.getAllByRole("alert", { hidden: true });
		expect(alerts[0]).toHaveTextContent("Le ladder « l9 »");
		expect(alerts[1]).toHaveTextContent("La page « h9 »");
	});

	describe("controls", () => {
		it("offers the switch between design and simulation", () => {
			renderApp({ controls: ["mode"] });

			const select = screen.getByRole("combobox");
			expect(select).toHaveValue("DESIGN");
			expect(
				screen.queryByRole("option", { name: /carte|board/i }),
			).not.toBeInTheDocument();
		});

		it("offers both modes on a project that can be edited", () => {
			renderApp({ controls: ["mode"] });

			expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
				"Conception",
				"Simulation",
			]);
		});

		it("offers the simulation only on a read-only project, which starts running", () => {
			renderApp({
				controls: ["mode"],
				editable: false,
				initialMode: "simulation",
			});

			expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
				"Simulation",
			]);
			expect(screen.getByRole("combobox")).toHaveValue("SIMULATION");
		});

		it("switches to the simulation, then offers its controls", () => {
			renderApp({ controls: ["mode", "simulation"] });

			fireEvent.change(screen.getAllByRole("combobox")[0], {
				target: { value: "SIMULATION" },
			});

			expect(screen.getAllByRole("combobox")[0]).toHaveValue("SIMULATION");
			expect(
				screen.getByRole("button", { name: "Mettre en pause" }),
			).toBeInTheDocument();
		});

		it("hides the history buttons on a read-only project", () => {
			renderApp({ controls: ["history"], editable: false });

			expect(
				screen.queryByRole("button", { name: "Annuler" }),
			).not.toBeInTheDocument();
		});

		it("offers the history buttons on an editable project", () => {
			renderApp({ controls: ["history"] });

			expect(
				screen.getByRole("button", { name: "Annuler" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Rétablir" }),
			).toBeInTheDocument();
		});

		it("offers the dialect selector on an editable project, which changes the dialect", () => {
			const project = ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
			]);
			renderApp({ project, controls: ["dialect"] });

			const select = screen.getByLabelText("Dialecte") as HTMLSelectElement;
			expect(select.value).toBe("FR");
			fireEvent.change(select, { target: { value: "EN" } });

			expect(
				(screen.getByLabelText("Dialecte") as HTMLSelectElement).value,
			).toBe("EN");
			expect(project.dialect).toBe("FR"); // the app works on a copy
		});

		it("hides the dialect selector on a read-only project", () => {
			renderApp({ controls: ["dialect"], editable: false });

			expect(screen.queryByLabelText("Dialecte")).not.toBeInTheDocument();
		});

		it("offers the analysis status, which opens the panel", () => {
			renderApp({ controls: ["analysis"] });

			fireEvent.click(
				screen.getByRole("button", { name: /Résultats de l'analyse/ }),
			);

			expect(
				screen.getByLabelText("close-analysis-errors"),
			).toBeInTheDocument();
		});

		it("offers the Analyse button in the toolbar in every mode when editing is enabled", () => {
			renderApp({ controls: ["mode", "analysis"] });
			expect(
				screen.getByRole("button", { name: "Analyser" }),
			).toBeInTheDocument();

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "SIMULATION" },
			});

			expect(
				screen.getByRole("button", { name: "Analyser" }),
			).toBeInTheDocument();
		});

		it("offers no Analyse button when editing is disabled", () => {
			renderApp({ controls: ["mode", "analysis"], editable: false });
			expect(
				screen.queryByRole("button", { name: "Analyser" }),
			).not.toBeInTheDocument();
		});

		it("only offers the analysis status in design mode", () => {
			renderApp({ controls: ["mode", "analysis"] });
			expect(
				screen.getByRole("button", { name: /Résultats de l'analyse/ }),
			).toBeInTheDocument();

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "SIMULATION" },
			});

			expect(
				screen.queryByRole("button", { name: /Résultats de l'analyse/ }),
			).not.toBeInTheDocument();
		});

		it("only offers the watch tables during the simulation", () => {
			renderApp({ controls: ["mode", "watch"] });
			expect(
				screen.queryByRole("button", { name: "Tables de visualisation" }),
			).not.toBeInTheDocument();

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "SIMULATION" },
			});

			expect(
				screen.getByRole("button", { name: "Tables de visualisation" }),
			).toBeInTheDocument();
		});
	});

	describe("watch panel", () => {
		it("is closed at mount by default", () => {
			renderApp({ initialMode: "simulation", controls: ["watch"] });

			expect(
				screen.queryByTestId("embedded-watch-panel"),
			).not.toBeInTheDocument();
		});

		it("opens from the status bar, and closes with its own button", () => {
			renderApp({ initialMode: "simulation", controls: ["watch"] });

			fireEvent.click(
				screen.getByRole("button", { name: "Tables de visualisation" }),
			);
			expect(screen.getByTestId("embedded-watch-panel")).toBeInTheDocument();

			fireEvent.click(screen.getByLabelText("close-watch-tables"));
			expect(
				screen.queryByTestId("embedded-watch-panel"),
			).not.toBeInTheDocument();
		});

		it("sits next to the pages, which keep their own place", () => {
			const { container } = renderApp({
				initialMode: "simulation",
				controls: ["watch"],
			});
			fireEvent.click(
				screen.getByRole("button", { name: "Tables de visualisation" }),
			);

			const panel = screen.getByTestId("embedded-watch-panel");
			const page = container.querySelector("#page-g1")!;
			expect(panel.contains(page)).toBe(false);
			expect(page.contains(panel)).toBe(false);
		});

		it("is open at mount with watchOpen", () => {
			renderApp({
				initialMode: "simulation",
				watchOpen: true,
				controls: ["watch"],
			});

			expect(screen.getByTestId("embedded-watch-panel")).toBeInTheDocument();
		});

		it("ignores watchOpen in design mode", () => {
			renderApp({
				initialMode: "design",
				watchOpen: true,
				controls: ["watch"],
			});

			expect(
				screen.queryByTestId("embedded-watch-panel"),
			).not.toBeInTheDocument();
		});
	});

	describe("analysis panel", () => {
		it("opens by itself when the simulation cannot start", () => {
			const project = ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1", "UNKNOWN_VARIABLE"),
			]);

			renderApp({ project, initialMode: "simulation", controls: ["mode"] });

			expect(
				screen.getByLabelText("close-analysis-errors"),
			).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toHaveValue("DESIGN");
		});

		it("closes with its button", () => {
			renderApp({ controls: ["analysis"] });
			fireEvent.click(
				screen.getByRole("button", { name: /Résultats de l'analyse/ }),
			);

			fireEvent.click(screen.getByLabelText("close-analysis-errors"));

			expect(
				screen.queryByLabelText("close-analysis-errors"),
			).not.toBeInTheDocument();
		});
	});

	describe("open in the application", () => {
		it("links to the application, in a new tab, next to the full screen", () => {
			renderApp({
				controls: ["openInApp", "fullscreen"],
				appHref: "/app?template=x",
			});

			const link = screen.getByRole("link", {
				name: "Ouvrir dans l'application",
			});
			expect(link).toHaveAttribute("href", "/app?template=x");
			expect(link).toHaveAttribute("target", "_blank");
			expect(
				link.compareDocumentPosition(
					screen.getByRole("button", { name: "Plein écran" }),
				) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		it("computes the destination at the click when it is a function", () => {
			const open = jest.spyOn(window, "open").mockImplementation(() => null);
			const appHref = jest.fn().mockReturnValue("/app?handoff=abc");
			const project = ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
			]);
			renderApp({ project, controls: ["openInApp"], appHref });
			expect(appHref).not.toHaveBeenCalled();

			fireEvent.click(
				screen.getByRole("button", { name: "Ouvrir dans l'application" }),
			);

			expect(appHref).toHaveBeenCalledTimes(1);
			const [handedProject, pages] = appHref.mock.calls[0];
			expect(handedProject.id).not.toBe("");
			expect(pages).toEqual({ pagesOrder: ["g1"], activePageId: "g1" });
			expect(open).toHaveBeenCalledWith(
				"/app?handoff=abc",
				"_blank",
				"noopener",
			);
			open.mockRestore();
		});

		it("is not offered without a destination", () => {
			renderApp({ controls: ["openInApp"] });

			expect(
				screen.queryByRole("link", { name: "Ouvrir dans l'application" }),
			).not.toBeInTheDocument();
		});

		it("is not offered unless asked for", () => {
			renderApp({ appHref: "/app?template=x" });

			expect(
				screen.queryByRole("link", { name: "Ouvrir dans l'application" }),
			).not.toBeInTheDocument();
		});
	});

	describe("full screen", () => {
		const enter = () =>
			fireEvent.click(screen.getByRole("button", { name: "Plein écran" }));

		it("is not offered without the control", () => {
			renderApp();

			expect(
				screen.queryByRole("button", { name: "Plein écran" }),
			).not.toBeInTheDocument();
		});

		it("covers the page with an overlay, and leaves with the button", () => {
			renderApp({ controls: ["fullscreen"] });

			enter();
			expect(screen.getByTestId("embedded-overlay")).toBeInTheDocument();

			fireEvent.click(
				screen.getByRole("button", { name: "Quitter le plein écran" }),
			);
			expect(screen.queryByTestId("embedded-overlay")).not.toBeInTheDocument();
		});

		it("leaves on a click on the overlay", () => {
			renderApp({ controls: ["fullscreen"] });
			enter();

			fireEvent.click(screen.getByTestId("embedded-overlay"));

			expect(screen.queryByTestId("embedded-overlay")).not.toBeInTheDocument();
		});

		it("leaves on Escape", () => {
			renderApp({ controls: ["fullscreen"] });
			enter();

			fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });

			expect(screen.queryByTestId("embedded-overlay")).not.toBeInTheDocument();
		});

		it("stays when an editor already consumed Escape", () => {
			renderApp({ controls: ["fullscreen"] });
			enter();
			const region = screen.getByRole("region");
			region.addEventListener("keydown", (event) => event.preventDefault(), {
				capture: true,
			});

			fireEvent.keyDown(region, { key: "Escape" });

			expect(screen.getByTestId("embedded-overlay")).toBeInTheDocument();
		});

		it("locks the scrolling of the page while it lasts", () => {
			renderApp({ controls: ["fullscreen"] });

			enter();
			expect(document.body.style.overflow).toBe("hidden");

			fireEvent.click(screen.getByTestId("embedded-overlay"));
			expect(document.body.style.overflow).toBe("");
		});

		it("keeps the simulation and the page mounted across the switch", () => {
			const { container } = renderApp({
				initialMode: "simulation",
				controls: ["mode", "fullscreen"],
			});
			const page = container.querySelector("#page-g1");

			enter();

			expect(container.querySelector("#page-g1")).toBe(page);
			expect(screen.getByRole("combobox")).toHaveValue("SIMULATION");
		});

		it("leaves the full screen of another block when one enters it", () => {
			const first = renderApp({ controls: ["fullscreen"] });
			const second = renderApp({ controls: ["fullscreen"] });
			expect(first.container).not.toBe(second.container);

			fireEvent.click(
				screen.getAllByRole("button", { name: "Plein écran" })[0],
			);
			expect(screen.getAllByTestId("embedded-overlay")).toHaveLength(1);

			fireEvent.click(
				screen.getAllByRole("button", { name: "Plein écran" })[0],
			);
			expect(screen.getAllByTestId("embedded-overlay")).toHaveLength(1);
		});
	});

	describe("keyboard shortcuts", () => {
		it("handles the editing shortcuts typed inside the block", () => {
			renderApp();

			fireEvent.keyDown(screen.getByRole("region"), {
				key: "z",
				ctrlKey: true,
			});

			expect(handleEditingShortcut).toHaveBeenCalledWith(
				expect.objectContaining({ key: "z", ctrlKey: true }),
				expect.anything(),
			);
		});

		it("does not handle what is typed outside the block", () => {
			renderApp();

			fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });

			expect(handleEditingShortcut).not.toHaveBeenCalled();
		});

		it("does not leave the full screen on Escape when a shortcut took the key", () => {
			jest.mocked(handleEditingShortcut).mockReturnValue(true);
			renderApp({ controls: ["fullscreen"] });
			fireEvent.click(screen.getByRole("button", { name: "Plein écran" }));

			fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });

			expect(screen.getByTestId("embedded-overlay")).toBeInTheDocument();
		});
	});

	describe("HMI view", () => {
		function hmiProject() {
			const project = ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
			]);
			const page = project.createHmiPage("Synoptique");
			return { project, pageId: page.id };
		}
		const palette = (container: HTMLElement) =>
			container.querySelectorAll('[draggable="true"]');

		it("offers the editor in design mode", () => {
			const { project, pageId } = hmiProject();

			const { container } = renderApp({
				project,
				views: [{ type: "hmi", pageId }],
			});

			expect(palette(container).length).toBeGreaterThan(0);
			expect(screen.getByText("Propriétés")).toBeInTheDocument();
		});

		it("shows no editing tool, but the properties panel, on a read-only project", () => {
			const { project, pageId } = hmiProject();

			const { container } = renderApp({
				project,
				editable: false,
				views: [{ type: "hmi", pageId }],
			});

			expect(palette(container)).toHaveLength(0);
			expect(screen.getByText("Propriétés")).toBeInTheDocument();
		});

		const switchMode = async (mode: "SIMULATION" | "DESIGN") => {
			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: mode },
			});
			await act(async () => {});
		};
		const tabNames = () =>
			screen.queryAllByRole("tab").map((tab) =>
				Array.from(tab.childNodes)
					.filter((node) => node.nodeType === Node.TEXT_NODE)
					.map((node) => node.textContent)
					.join(""),
			);

		it("shows the page running, without editing tool, in simulation", () => {
			const { project, pageId } = hmiProject();

			const { container } = renderApp({
				project,
				initialMode: "simulation",
				views: [{ type: "hmi", pageId }],
			});

			expect(container.querySelector("#page-hmi-simulation")).toHaveStyle(
				"display: flex",
			);
			expect(
				screen.queryByText("Aucune page HMI à afficher."),
			).not.toBeInTheDocument();
		});

		it("replaces the HMI tabs with the simulation tab while it runs", async () => {
			const { project, pageId } = hmiProject();
			const { container } = renderApp({
				project,
				controls: ["mode"],
				views: [
					{ type: "grafcet", id: "g1" },
					{ type: "hmi", pageId },
				],
			});
			expect(tabNames()).toEqual(["Simple Cycle Grafcet", "Synoptique"]);

			await switchMode("SIMULATION");

			expect(tabNames()).toEqual(["Simple Cycle Grafcet", "Simulation HMI"]);
			expect(container.querySelector("#page-hmi-simulation")).toHaveStyle(
				"display: flex",
			);
			expect(container.querySelector(`#page-${pageId}`)).toHaveStyle(
				"display: none",
			);

			await switchMode("DESIGN");

			expect(tabNames()).toEqual(["Simple Cycle Grafcet", "Synoptique"]);
			expect(container.querySelector("#page-hmi-simulation")).toBeNull();
		});

		it("keeps the edited HMI page mounted during the simulation", async () => {
			const { project, pageId } = hmiProject();
			const { container } = renderApp({
				project,
				controls: ["mode"],
				views: [{ type: "hmi", pageId }],
			});
			const page = container.querySelector(`#page-${pageId}`);

			await switchMode("SIMULATION");
			expect(container.querySelector(`#page-${pageId}`)).toBe(page);

			await switchMode("DESIGN");
			expect(container.querySelector(`#page-${pageId}`)).toBe(page);
			expect(page).toHaveStyle("display: flex");
		});

		it("brings back the tab that was active before the simulation", async () => {
			const { project, pageId } = hmiProject();
			const { container } = renderApp({
				project,
				controls: ["mode"],
				views: [
					{ type: "hmi", pageId },
					{ type: "grafcet", id: "g1" },
				],
				initialView: { type: "grafcet", id: "g1" },
			});

			await switchMode("SIMULATION");
			await switchMode("DESIGN");

			expect(container.querySelector("#page-g1")).toHaveStyle("display: flex");
			expect(container.querySelector(`#page-${pageId}`)).toHaveStyle(
				"display: none",
			);
		});

		it("opens no simulation tab when the block shows no HMI page", async () => {
			const { project } = hmiProject();
			const { container } = renderApp({
				project,
				controls: ["mode"],
				views: [{ type: "grafcet", id: "g1" }],
			});

			await switchMode("SIMULATION");

			expect(container.querySelector("#page-hmi-simulation")).toBeNull();
			expect(tabNames()).toEqual([]);
		});

		it("shows no tab bar for the simulation tab alone", async () => {
			const { project, pageId } = hmiProject();
			renderApp({
				project,
				controls: ["mode"],
				views: [{ type: "hmi", pageId }],
			});
			expect(tabNames()).toEqual([]);

			await switchMode("SIMULATION");

			expect(tabNames()).toEqual([]);
		});
	});

	describe("ladder view", () => {
		function ladderProject() {
			const project = ProjectFactory.createEmpty();
			const ladder = project.createLadder("Pompe");
			return { project, ladderId: ladder.id };
		}

		it("shows the ladder of the view", () => {
			const { project, ladderId } = ladderProject();

			const { container } = renderApp({
				project,
				views: [{ type: "ladder", id: ladderId }],
			});

			expect(container.querySelector(".ladder-page")).toBeInTheDocument();
			expect(screen.getByText("Réseau").closest("button")).toBeEnabled();
		});

		it("shows the toolbar on a read-only project, its tools not draggable and its zoom available", () => {
			const { project, ladderId } = ladderProject();

			const { container } = renderApp({
				project,
				editable: false,
				views: [{ type: "ladder", id: ladderId }],
			});

			expect(container.querySelector(".ladder-page")).toBeInTheDocument();
			expect(container.querySelector(".ladder-toolbar")).toBeInTheDocument();
			expect(
				container.querySelector('.ladder-toolbar [draggable="true"]'),
			).not.toBeInTheDocument();
			expect(
				container.querySelector(".ladder-toolbar .app-toolbar__zoom-in"),
			).toBeInTheDocument();
		});

		it("explains a ladder that does not exist", () => {
			renderApp({ views: [{ type: "ladder", id: "nope" }] });

			expect(screen.getByRole("alert")).toHaveTextContent("Le ladder « nope »");
		});
	});

	describe("3D scene view", () => {
		function sceneProject() {
			const project = ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
			]);
			project.scene3d = {
				sceneId: "carton-sorting",
				sceneVersion: 1,
				bindings: {},
			};
			return project;
		}

		it("shows a progress indicator while the scene is loading", async () => {
			renderApp({
				project: sceneProject(),
				views: [{ type: "scene3d" }],
			});

			expect(
				screen.queryByRole("progressbar", { name: "Chargement…" }),
			).toBeInTheDocument();
			expect(await screen.findByTestId("inline-scene")).toBeInTheDocument();
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		it("only shows the scene once its tab is displayed", async () => {
			renderApp({
				project: sceneProject(),
				views: [{ type: "grafcet", id: "g1" }, { type: "scene3d" }],
			});
			await act(async () => {});
			expect(screen.queryByTestId("inline-scene")).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole("tab", { name: /Scène 3D/ }));

			expect(await screen.findByTestId("inline-scene")).toBeInTheDocument();
		});

		it("drops the scene when another tab is displayed", async () => {
			renderApp({
				project: sceneProject(),
				views: [{ type: "scene3d" }, { type: "grafcet", id: "g1" }],
			});
			expect(await screen.findByTestId("inline-scene")).toBeInTheDocument();

			fireEvent.click(screen.getAllByRole("tab")[1]);

			expect(screen.queryByTestId("inline-scene")).not.toBeInTheDocument();
		});

		it("explains a scene view on a project without scene", () => {
			renderApp({ views: [{ type: "scene3d" }] });

			expect(screen.getByRole("alert")).toHaveTextContent(
				"Ce projet n'a pas de scène 3D.",
			);
		});
	});

	describe("variables view", () => {
		function variablesProject() {
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("I0"),
			]);
			return project;
		}

		it("shows the table of a variables page of the application, and only that one", async () => {
			renderApp({
				project: variablesProject(),
				views: [{ type: "variables", pageId: "output-variables" }],
			});

			expect(
				await screen.findByRole("heading", { name: "Variables de sortie" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Variables d'entrée" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Constantes" }),
			).not.toBeInTheDocument();
		});

		it("lets the variables be added when the project can be edited", async () => {
			renderApp({
				project: variablesProject(),
				views: [{ type: "variables", pageId: "input-variables" }],
			});

			expect(
				(await screen.findAllByRole("button", { name: "Nouvelle variable" }))
					.length,
			).toBeGreaterThan(0);
		});

		it("only shows the variables on a read-only project", async () => {
			renderApp({
				project: variablesProject(),
				editable: false,
				views: [{ type: "variables", pageId: "input-variables" }],
			});
			await screen.findByRole("heading", { name: "Variables d'entrée" });

			expect(
				screen.queryByRole("button", { name: "Nouvelle variable" }),
			).not.toBeInTheDocument();
		});
	});

	describe("frozen views", () => {
		function twoGrafcets() {
			return ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
				GrafcetFactory.createSimpleCycle("g2"),
			]);
		}
		it("shows a locked view read-only, and the others editable", () => {
			const { container } = renderApp({
				project: twoGrafcets(),
				views: [
					{ type: "grafcet", id: "g1", locked: true },
					{ type: "grafcet", id: "g2" },
				],
			});

			expect(container.querySelector("#grafcet-g1")).toHaveClass(
				"flow-page--readonly",
			);
			expect(
				container.querySelector("#page-g1 .grafcet-toolbar__action"),
			).toHaveClass("grafcet-toolbar__tool--disabled");
			fireEvent.click(screen.getAllByRole("tab")[1]);
			expect(container.querySelector("#grafcet-g2")).not.toHaveClass(
				"flow-page--readonly",
			);
			expect(
				container.querySelector("#page-g2 .grafcet-toolbar__action"),
			).not.toHaveClass("grafcet-toolbar__tool--disabled");
		});

		it("marks only the frozen tab with a padlock", () => {
			const project = twoGrafcets();
			renderApp({
				project,
				views: [
					{ type: "grafcet", id: "g1", locked: true },
					{ type: "grafcet", id: "g2" },
				],
			});

			const [first, second] = screen.getAllByRole("tab");
			expect(
				within(first).getByRole("img", { name: "Lecture seule" }),
			).toBeInTheDocument();
			expect(within(second).queryByRole("img")).toBeNull();
		});

		it("marks every editor tab with a padlock during the simulation, and removes it in design", async () => {
			renderApp({
				controls: ["mode"],
				views: [
					{ type: "grafcet", id: "g1" },
					{ type: "variables", pageId: "output-variables" },
				],
			});
			expect(screen.queryAllByRole("img", { name: "Lecture seule" })).toEqual(
				[],
			);

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "SIMULATION" },
			});
			await act(async () => {});
			expect(
				screen.getAllByRole("img", { name: "Lecture seule" }),
			).toHaveLength(2);

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "DESIGN" },
			});
			await act(async () => {});
			expect(screen.queryAllByRole("img", { name: "Lecture seule" })).toEqual(
				[],
			);
		});

		it("marks every editor tab of a read-only block", () => {
			renderApp({
				editable: false,
				views: [
					{ type: "grafcet", id: "g1" },
					{ type: "variables", pageId: "output-variables" },
				],
			});

			expect(
				screen.getAllByRole("img", { name: "Lecture seule" }),
			).toHaveLength(2);
		});

		describe("HMI page", () => {
			function hmiProjectWithText() {
				const project = ProjectFactory.createWithGrafcets([
					GrafcetFactory.createSimpleCycle("g1"),
				]);
				const page = project.createHmiPage("Synoptique");
				page.addWidget(
					HmiWidget.create(
						"text",
						20,
						20,
						{ width: 120, height: 30 },
						{ text: "Bonjour" },
						0,
						"Titre",
					),
				);
				return { project, pageId: page.id };
			}
			const palette = (container: HTMLElement) =>
				container.querySelectorAll('[draggable="true"]');

			it("shows a frozen page without editing tool", () => {
				const { project, pageId } = hmiProjectWithText();
				const { container } = renderApp({
					project,
					views: [{ type: "hmi", pageId, locked: true }],
				});

				expect(palette(container)).toHaveLength(0);
			});

			it("lets the properties of a widget of a frozen page be read, not modified", () => {
				const { project, pageId } = hmiProjectWithText();
				renderApp({
					project,
					views: [{ type: "hmi", pageId, locked: true }],
				});
				expect(screen.getByText("Propriétés")).toBeInTheDocument();

				fireEvent.mouseDown(screen.getByText("Bonjour"));

				const name = screen.getByLabelText("Nom");
				expect(name).toHaveValue("Titre");
				expect(name.closest("[inert]")).not.toBeNull();
				expect(
					screen.getByRole("button", { name: "Animations" }).closest("[inert]"),
				).toBeNull();
			});

			it("leaves the properties of an editable page modifiable", () => {
				const { project, pageId } = hmiProjectWithText();
				renderApp({ project, views: [{ type: "hmi", pageId }] });

				fireEvent.mouseDown(screen.getByText("Bonjour"));

				expect(screen.getByLabelText("Nom").closest("[inert]")).toBeNull();
			});

			it("offers resize handles on a selected widget only when the page can be edited", () => {
				const resizeHandles = (container: HTMLElement) =>
					Array.from(container.querySelectorAll("*")).filter((element) =>
						getComputedStyle(element).cursor.includes("resize"),
					).length;
				const { project, pageId } = hmiProjectWithText();
				const editable = renderApp({
					project,
					views: [{ type: "hmi", pageId }],
				});
				fireEvent.mouseDown(screen.getByText("Bonjour"));
				const withHandles = resizeHandles(editable.container);
				editable.unmount();

				const frozenProject = hmiProjectWithText();
				const frozen = renderApp({
					project: frozenProject.project,
					views: [{ type: "hmi", pageId: frozenProject.pageId, locked: true }],
				});
				fireEvent.mouseDown(screen.getByText("Bonjour"));
				expect(resizeHandles(frozen.container)).toBeLessThan(withHandles);
			});

			it("shows the properties of a page of a read-only block, in design mode", () => {
				const { project, pageId } = hmiProjectWithText();
				renderApp({
					project,
					editable: false,
					views: [{ type: "hmi", pageId }],
				});

				fireEvent.mouseDown(screen.getByText("Bonjour"));

				expect(screen.getByLabelText("Nom").closest("[inert]")).not.toBeNull();
			});
		});

		it("shows a frozen variables page without the means to add a variable", async () => {
			renderApp({
				project: ProjectFactory.createWithVariables([
					VariableFactory.createLogicInput("I0"),
				]),
				views: [{ type: "variables", pageId: "input-variables", locked: true }],
			});
			await screen.findByRole("heading", { name: "Variables d'entrée" });

			expect(
				screen.queryByRole("button", { name: "Nouvelle variable" }),
			).not.toBeInTheDocument();
		});

		it("keeps a view read-only when the block itself is read-only, even if the view is not locked", () => {
			const { container } = renderApp({
				editable: false,
				views: [{ type: "grafcet", id: "g1", locked: false }],
			});

			expect(container.querySelector("#grafcet-g1")).toHaveClass(
				"flow-page--readonly",
			);
		});
	});

	describe("going to a program from the analysis", () => {
		function twoGrafcets() {
			return ProjectFactory.createWithGrafcets([
				GrafcetFactory.createSimpleCycle("g1"),
				GrafcetFactory.createSimpleCycle("g2", "UNKNOWN_VARIABLE", "VRAI", 10),
			]);
		}
		const errorOfSecondGrafcet = () => {
			const heading = screen.getByText(/Simple Cycle Grafcet/, {
				selector: "h6",
			});
			return heading.parentElement!.querySelector("li")!;
		};

		it("selects the tab of the program an error belongs to", () => {
			renderApp({
				project: twoGrafcets(),
				initialMode: "simulation",
				views: [
					{ type: "grafcet", id: "g1" },
					{ type: "grafcet", id: "g2" },
				],
			});
			expect(screen.getAllByRole("tab")[0]).toHaveAttribute(
				"aria-selected",
				"true",
			);

			fireEvent.click(errorOfSecondGrafcet());

			expect(screen.getAllByRole("tab")[1]).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		it("opens no tab for a program that is not one of the views", () => {
			renderApp({
				project: twoGrafcets(),
				initialMode: "simulation",
				views: [{ type: "grafcet", id: "g1" }],
			});

			fireEvent.click(errorOfSecondGrafcet());

			expect(screen.queryByRole("tab")).not.toBeInTheDocument();
			expect(document.querySelector("#page-g2")).not.toBeInTheDocument();
		});
	});

	describe("in-place editing", () => {
		const stepNumberInput = (container: HTMLElement) =>
			container.querySelector<HTMLInputElement>(
				"#grafcet-node-g1-step-0 input",
			);

		it("opens the step number editor on a double click when the project can be edited", () => {
			const { container } = renderApp();
			const input = stepNumberInput(container)!;
			expect(input.style.pointerEvents).toBe("none");

			fireEvent.doubleClick(
				container.querySelector("#grafcet-node-g1-step-0")!,
			);

			expect(input.style.pointerEvents).toBe("all");
		});

		it("does nothing on a double click when the project is read-only", () => {
			const { container } = renderApp({ editable: false });
			const input = stepNumberInput(container)!;

			fireEvent.doubleClick(
				container.querySelector("#grafcet-node-g1-step-0")!,
			);

			expect(input.style.pointerEvents).toBe("none");
		});

		it("does nothing on a double click during the simulation", () => {
			const { container } = renderApp({ initialMode: "simulation" });
			const input = stepNumberInput(container)!;

			fireEvent.doubleClick(
				container.querySelector("#grafcet-node-g1-step-0")!,
			);

			expect(input.style.pointerEvents).toBe("none");
		});
	});
});
