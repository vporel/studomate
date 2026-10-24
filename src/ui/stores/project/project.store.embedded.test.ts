/**
 * @jest-environment jsdom
 */
import { toast } from "react-toastify";
import trackEvent from "@/ui/services/analytics";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import createEmbeddedProjectStoreEnvironment from "./environment/embedded-project-store-environment";
import { PersistenceUnavailableError } from "./environment/project-store-environment";
import { ProjectMode } from "./ProjectMode.enum";
import { createProjectStore } from "./project.store";

jest.mock("react-toastify", () => ({
	toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

function openedStore() {
	const store = createProjectStore(
		createEmbeddedProjectStoreEnvironment({ locale: "fr" }),
	);
	const project = ProjectFactory.createWithGrafcets([
		GrafcetFactory.createSimpleCycle("g1"),
	]);
	store.getState().lifecycleManager.openProjectInstance(project, []);
	return { store, project };
}

describe("openProjectInstance", () => {
	const pages = ["a", "b", "c"].map((id) => ({
		id,
		type: "grafcet" as const,
		title: id,
	}));
	const open = (activePageId?: string) => {
		const store = createProjectStore(
			createEmbeddedProjectStoreEnvironment({ locale: "fr" }),
		);
		store
			.getState()
			.lifecycleManager.openProjectInstance(
				ProjectFactory.createEmpty(),
				pages,
				activePageId,
			);
		return store.getState();
	};

	it("activates the first page by default", () => {
		const state = open();
		expect(state.activePageId).toBe("a");
		expect(state.activeScope).toBe("a");
	});

	it("activates the page asked for, keeping the order of the tabs", () => {
		const state = open("c");
		expect(state.pagesOrder).toEqual(["a", "b", "c"]);
		expect(state.activePageId).toBe("c");
		expect(state.activeScope).toBe("c");
	});

	it("activates the first page when the one asked for is not open", () => {
		expect(open("nope").activePageId).toBe("a");
	});
});

describe("project store with the embedded environment", () => {
	let storageWrites: jest.SpyInstance[];
	let historyWrites: jest.SpyInstance[];
	let windowOpen: jest.SpyInstance;
	let fetchSpy: jest.Mock;

	beforeEach(() => {
		jest.useFakeTimers();
		ProjectFactory.reset();
		storageWrites = ["setItem", "removeItem", "clear"].map((method) =>
			jest.spyOn(Storage.prototype, method as "setItem"),
		);
		historyWrites = ["pushState", "replaceState"].map((method) =>
			jest.spyOn(window.history, method as "pushState"),
		);
		windowOpen = jest.spyOn(window, "open").mockReturnValue(null);
		fetchSpy = jest.fn();
		global.fetch = fetchSpy;
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it("is idle at creation and keeps no repository", () => {
		const store = createProjectStore(
			createEmbeddedProjectStoreEnvironment({ locale: "fr" }),
		);

		expect(store.getState().bootStatus).toBe("idle");
		expect(() => store.getState().projectRepository.list()).toThrow();
	});

	it("opens, edits, simulates and stops without writing anywhere", () => {
		const { store, project } = openedStore();
		const { simulationManager, commandsStackManager } = store.getState();

		expect(store.getState().project).toBe(project);
		store.getState().setProjectName("Renamed");
		expect(store.getState().hasUnsavedChanges).toBe(true);
		commandsStackManager.undoOperation();
		expect(simulationManager.setSimulationMode()).toBe(true);
		expect(store.getState().mode).toBe(ProjectMode.SIMULATION);
		jest.advanceTimersByTime(500);
		simulationManager.setPlcSimulationMode(
			store.getState().simulationMode === "continuous"
				? ("step-by-step" as never)
				: ("continuous" as never),
		);
		simulationManager.setDesignMode();

		for (const spy of [...storageWrites, ...historyWrites]) {
			expect(spy).not.toHaveBeenCalled();
		}
		expect(windowOpen).not.toHaveBeenCalled();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
		expect(toast.success).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.warn).not.toHaveBeenCalled();
	});

	it("announces the result of an analysis with a toast in the environment locale", () => {
		const { store } = openedStore();
		store.getState().simulationManager.analyze();
		expect(toast.success).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Analyse terminée"));
	});

	it("opens only the given pages and activates the first one", () => {
		const store = createProjectStore(
			createEmbeddedProjectStoreEnvironment({ locale: "fr" }),
		);
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);

		store.getState().lifecycleManager.openProjectInstance(project, [
			{ id: "g2", type: "grafcet", title: "G2" },
			{ id: "g1", type: "grafcet", title: "G1" },
		]);

		expect(store.getState().pagesOrder).toEqual(["g2", "g1"]);
		expect(store.getState().activePageId).toBe("g2");
		expect(store.getState().activeScope).toBe("g2");
		expect(store.getState().activeScopeType).toBe("grafcet");
	});

	it("keeps the simulation mode preference in memory only", () => {
		const first = createEmbeddedProjectStoreEnvironment({ locale: "fr" });
		const second = createEmbeddedProjectStoreEnvironment({ locale: "fr" });

		first.preferences.setSimulationMode("step-by-step" as never);

		expect(first.preferences.getSimulationMode()).toBe("step-by-step");
		expect(second.preferences.getSimulationMode()).toBe("continuous");
		expect(localStorage.getItem("studomate:simulationMode")).toBeNull();
	});

	it("refuses to share, since there is no persistence", async () => {
		const { store } = openedStore();

		await expect(
			store.getState().sharingManager.shareProject(),
		).rejects.toThrow(PersistenceUnavailableError);
	});

	it("does not touch the clipboard of another store", () => {
		const { store: a } = openedStore();
		const { store: b } = openedStore();
		a.getState().clipboard.getState().setEntry({ scope: "grafcet", data: {} });

		b.getState().lifecycleManager.openProjectInstance(
			ProjectFactory.createEmpty(),
			[],
		);

		expect(a.getState().clipboard.getState().entry).not.toBeNull();
	});
});
