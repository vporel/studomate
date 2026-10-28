/**
 * @jest-environment jsdom
 */
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import createEmbeddedProjectStoreEnvironment from "@/ui/stores/project/environment/embedded-project-store-environment";
import { createProjectStore } from "@/ui/stores/project/project.store";
import followModeWithHmiSimulationTab from "./follow-mode-with-hmi-simulation-tab";

jest.mock("react-toastify", () => ({
	toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

function openedStore(shownHmiPages: (index: number) => boolean = () => true) {
	const store = createProjectStore(
		createEmbeddedProjectStoreEnvironment({ locale: "fr" }),
	);
	const project = ProjectFactory.createWithGrafcets([
		GrafcetFactory.createSimpleCycle("g1"),
	]);
	const hmiPages = ["Principale", "Secondaire"].map((name) =>
		project.createHmiPage(name),
	);
	store.getState().lifecycleManager.openProjectInstance(project, [
		{ id: "g1", type: "grafcet", title: "G1" },
		...[hmiPages[1], hmiPages[0]]
			.filter((_, index) => shownHmiPages(index))
			.map((page) => ({
				id: page.id,
				type: "hmi" as const,
				title: page.name,
			})),
	]);
	return { store, main: hmiPages[0], secondary: hmiPages[1] };
}

describe("followModeWithHmiSimulationTab", () => {
	it("starts the simulation on the first HMI page of the block, not the main one", () => {
		const { store, main, secondary } = openedStore();
		followModeWithHmiSimulationTab(store);

		store.getState().simulationManager.setSimulationMode();

		expect(main.id).not.toBe(secondary.id);
		expect(store.getState().pagesOrder).toContain("hmi-simulation");
		expect(store.getState().activePageId).toBe("hmi-simulation");
		expect(store.getState().hmiSimulationActivePageId).toBe(secondary.id);
	});

	it("opens no simulation tab when the block shows no HMI page", () => {
		const { store } = openedStore(() => false);
		followModeWithHmiSimulationTab(store);

		store.getState().simulationManager.setSimulationMode();

		expect(store.getState().pagesOrder).not.toContain("hmi-simulation");
	});

	it("brings back the tab active before the simulation", () => {
		const { store } = openedStore();
		followModeWithHmiSimulationTab(store);
		store.getState().pagesManager.setActivePage("g1");

		store.getState().simulationManager.setSimulationMode();
		store.getState().simulationManager.setDesignMode();

		expect(store.getState().pagesOrder).not.toContain("hmi-simulation");
		expect(store.getState().activePageId).toBe("g1");
	});

	it("stops following the mode once the returned function is called", () => {
		const { store } = openedStore();
		const stop = followModeWithHmiSimulationTab(store);
		stop();

		store.getState().simulationManager.setSimulationMode();

		expect(store.getState().pagesOrder).not.toContain("hmi-simulation");
	});
});
