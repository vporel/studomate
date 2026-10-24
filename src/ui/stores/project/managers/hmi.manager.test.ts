import HmiPage from "@/schemas/hmi/hmi-page.schema";
import Project from "@/schemas/project/project.schema";
import { ProjectStoreState } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";
import HmiManager, { HMI_SIMULATION_PAGE_ID } from "./hmi.manager";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: any[]) => mockTrackEvent(...args),
}));

function makeManager(initial: {
	project?: Project | null;
	hmiSimulationActivePageId?: string | null;
	mode?: ProjectMode;
}) {
	let state = {
		project: initial.project ?? null,
		mode: initial.mode ?? ProjectMode.DESIGN,
		hmiSimulationActivePageId: initial.hmiSimulationActivePageId ?? null,
		hmiStoresManagers: {},
		pagesData: {},
		pagesManager: { openPage: jest.fn(), closePage: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new HmiManager(set, get), getState: () => state };
}

function mountFakeStore(
	getState: () => ProjectStoreState,
	page: HmiPage,
): { current: () => HmiPage; adoptHmiPage: jest.Mock } {
	let held = page.copy();
	const adoptHmiPage = jest.fn((adopted: HmiPage) => {
		held = adopted;
	});
	(getState() as any).hmiStoresManagers = {
		...getState().hmiStoresManagers,
		[page.id]: { getHmiPage: () => held, adoptHmiPage },
	};
	return { current: () => held, adoptHmiPage };
}

describe("HmiManager", () => {
	beforeEach(() => mockTrackEvent.mockClear());

	describe("newHmiPage", () => {
		it("crée la page, ouvre son onglet et enregistre l'événement", () => {
			const { manager, getState } = makeManager({
				project: new Project("p1", "Projet", "auteur"),
			});

			const page = manager.newHmiPage("Vue 1");

			expect(page).not.toBeNull();
			expect(getState().pagesManager.openPage).toHaveBeenCalledWith({
				id: page!.id,
				type: "hmi",
				title: "Vue 1",
			});
			expect(mockTrackEvent).toHaveBeenCalledWith("hmi-page-created");
		});
	});

	describe("setMainHmiPage", () => {
		it("désigne la nouvelle page principale et retire le statut à l'ancienne", () => {
			const project = new Project("p1", "Projet", "");
			const first = project.createHmiPage("Vue 1");
			const second = project.createHmiPage("Vue 2");
			const { manager, getState } = makeManager({ project });

			manager.setMainHmiPage(second.id);

			const newProject = getState().project!;
			expect(newProject.getHmiPage(first.id)!.isMain).toBe(false);
			expect(newProject.getHmiPage(second.id)!.isMain).toBe(true);
		});

		it("leaves exactly one main page once mounted stores push their pages back", () => {
			const project = new Project("p1", "Projet", "");
			const first = project.createHmiPage("Vue 1");
			const second = project.createHmiPage("Vue 2");
			const { manager, getState } = makeManager({ project });
			const storeA = mountFakeStore(getState, project.getHmiPage(first.id)!);
			const storeB = mountFakeStore(getState, project.getHmiPage(second.id)!);

			manager.setMainHmiPage(second.id);
			manager.updateHmiPageData(storeA.current());
			manager.updateHmiPageData(storeB.current());

			const pages = Object.values(getState().project!.hmiPages);
			expect(pages.filter((p) => p.isMain).map((p) => p.id)).toEqual([
				second.id,
			]);
		});

		it("still works outside design mode", () => {
			const project = new Project("p1", "Projet", "");
			project.createHmiPage("Vue 1");
			const second = project.createHmiPage("Vue 2");
			const { manager, getState } = makeManager({
				project,
				mode: ProjectMode.SIMULATION,
			});

			manager.setMainHmiPage(second.id);

			expect(getState().project!.getHmiPage(second.id)!.isMain).toBe(true);
		});
	});

	describe("renameHmiPage", () => {
		it("keeps the new name when a mounted store pushes its page back", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });
			const store = mountFakeStore(getState, project.getHmiPage(page.id)!);

			manager.renameHmiPage(page.id, "Renommée");

			expect(store.adoptHmiPage).toHaveBeenCalledTimes(1);
			expect(store.adoptHmiPage.mock.calls[0][0].name).toBe("Renommée");
			manager.updateHmiPageData(store.current());
			expect(getState().project!.getHmiPage(page.id)!.name).toBe("Renommée");
		});

		it("is refused outside design mode", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({
				project,
				mode: ProjectMode.SIMULATION,
			});

			manager.renameHmiPage(page.id, "Renommée");

			expect(getState().project).toBe(project);
			expect(project.getHmiPage(page.id)!.name).toBe("Vue 1");
		});
	});

	describe("deleteHmiPage", () => {
		it("closes the tab, removes the page and resets its commands stack", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });
			const previousStack = manager.getCommandsStack(page.id);

			manager.deleteHmiPage(page.id);

			expect(getState().pagesManager.closePage).toHaveBeenCalledWith(page.id);
			expect(getState().project!.getHmiPage(page.id)).toBeUndefined();
			expect(getState().hasUnsavedChanges).toBe(true);
			expect(manager.getCommandsStack(page.id)).not.toBe(previousStack);
		});
	});

	describe("updateHmiPageData", () => {
		it("does not write the project when the page equals the project's", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });

			manager.updateHmiPageData(page.copy());

			expect(getState().project).toBe(project);
			expect(getState().hasUnsavedChanges).toBeUndefined();
		});

		it("writes a new project when the page differs", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });
			const edited = page.copy();
			edited.name = "Modifiée";

			manager.updateHmiPageData(edited);

			expect(getState().project).not.toBe(project);
			expect(getState().project!.getHmiPage(page.id)!.name).toBe("Modifiée");
			expect(getState().hasUnsavedChanges).toBe(true);
		});
	});

	describe("openHmiSimulationPageIfAny", () => {
		it("ouvre l'onglet et affiche la page principale si le projet a au moins une page HMI", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });

			expect(manager.openHmiSimulationPageIfAny()).toBe(true);

			expect(getState().hmiSimulationActivePageId).toBe(page.id);
			expect(getState().pagesManager.openPage).toHaveBeenCalledWith({
				id: HMI_SIMULATION_PAGE_ID,
				type: "hmi-simulation",
				title: "Simulation HMI",
			});
		});

		it("ne fait rien si le projet n'a aucune page HMI", () => {
			const project = new Project("p1", "Projet", "");
			const { manager, getState } = makeManager({ project });

			expect(manager.openHmiSimulationPageIfAny()).toBe(false);

			expect(getState().hmiSimulationActivePageId).toBeNull();
			expect(getState().pagesManager.openPage).not.toHaveBeenCalled();
		});
	});

	describe("closeHmiSimulationPage", () => {
		it("ferme l'onglet et efface la page affichée", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({
				project,
				hmiSimulationActivePageId: page.id,
			});

			manager.closeHmiSimulationPage();

			expect(getState().hmiSimulationActivePageId).toBeNull();
			expect(getState().pagesManager.closePage).toHaveBeenCalledWith(
				HMI_SIMULATION_PAGE_ID,
			);
		});
	});

	describe("navigateHmiSimulation", () => {
		it("change la page affichée sans toucher aux onglets", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const target = project.createHmiPage("Vue 2");
			const { manager, getState } = makeManager({
				project,
				hmiSimulationActivePageId: page.id,
			});

			manager.navigateHmiSimulation(target.id);

			expect(getState().hmiSimulationActivePageId).toBe(target.id);
			expect(getState().pagesManager.openPage).not.toHaveBeenCalled();
		});
	});

	describe("syncMountedStoresFromProject", () => {
		function setup(storePageDiffers: boolean) {
			const project = new Project("p1", "Projet", "auteur");
			const page = project.createHmiPage("Page");
			const { manager, getState } = makeManager({ project });
			const stored = page.copy();
			if (storePageDiffers) stored.name = "Autre";
			const adoptHmiPage = jest.fn();
			(getState() as any).hmiStoresManagers = {
				[page.id]: { getHmiPage: () => stored, adoptHmiPage },
			};
			return { manager, adoptHmiPage, page };
		}

		it("adopts a copy of the project's page when the store differs", () => {
			const { manager, adoptHmiPage, page } = setup(true);
			manager.syncMountedStoresFromProject();
			expect(adoptHmiPage).toHaveBeenCalledTimes(1);
			const adopted = adoptHmiPage.mock.calls[0][0];
			expect(adopted).not.toBe(page);
			expect(adopted.name).toBe("Page");
		});

		it("adopts nothing when the store is up to date", () => {
			const { manager, adoptHmiPage } = setup(false);
			manager.syncMountedStoresFromProject();
			expect(adoptHmiPage).not.toHaveBeenCalled();
		});
	});

	describe("clearCommandsStacksOf", () => {
		it("empties the existing stacks in place, only for the given ids", () => {
			const { manager } = makeManager({});
			const target = manager.getCommandsStack("a");
			const other = manager.getCommandsStack("b");
			target.commandsToUndo.push([{} as any]);
			other.commandsToUndo.push([{} as any]);

			manager.clearCommandsStacksOf(["a"]);

			expect(manager.getCommandsStack("a")).toBe(target);
			expect(target.commandsToUndo).toHaveLength(0);
			expect(other.commandsToUndo).toHaveLength(1);
		});

		it("does not create a stack for an unknown id", () => {
			const { manager } = makeManager({});

			manager.clearCommandsStacksOf(["unknown"]);

			expect(manager.getCommandsStack("unknown").commandsToUndo).toEqual([]);
			expect((manager as any).commandsStacks.size).toBe(1);
		});

		it("refreshes the flags of the mounted store", () => {
			const refreshFlags = jest.fn();
			const { manager, getState } = makeManager({});
			(getState() as any).hmiStoresManagers = {
				a: { commandsStackManager: { refreshFlags } },
			};

			manager.clearCommandsStacksOf(["a", "no-store"]);

			expect(refreshFlags).toHaveBeenCalledTimes(1);
		});
	});
});
