import Project from "@/schemas/project/project.schema";
import { ProjectStoreState } from "../project.store";
import HmiManager, { HMI_SIMULATION_PAGE_ID } from "./hmi.manager";

function makeManager(initial: { project?: Project | null; hmiSimulationActivePageId?: string | null }) {
	let state = {
		project: initial.project ?? null,
		hmiSimulationActivePageId: initial.hmiSimulationActivePageId ?? null,
		pagesManager: { openPage: jest.fn(), closePage: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new HmiManager(set, get), getState: () => state };
}

describe("HmiManager", () => {
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
	});

	describe("openHmiSimulationPageIfAny", () => {
		it("ouvre l'onglet et affiche la page principale si le projet a au moins une page HMI", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project });

			manager.openHmiSimulationPageIfAny();

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

			manager.openHmiSimulationPageIfAny();

			expect(getState().hmiSimulationActivePageId).toBeNull();
			expect(getState().pagesManager.openPage).not.toHaveBeenCalled();
		});
	});

	describe("closeHmiSimulationPage", () => {
		it("ferme l'onglet et efface la page affichée", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const { manager, getState } = makeManager({ project, hmiSimulationActivePageId: page.id });

			manager.closeHmiSimulationPage();

			expect(getState().hmiSimulationActivePageId).toBeNull();
			expect(getState().pagesManager.closePage).toHaveBeenCalledWith(HMI_SIMULATION_PAGE_ID);
		});
	});

	describe("navigateHmiSimulation", () => {
		it("change la page affichée sans toucher aux onglets", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const target = project.createHmiPage("Vue 2");
			const { manager, getState } = makeManager({ project, hmiSimulationActivePageId: page.id });

			manager.navigateHmiSimulation(target.id);

			expect(getState().hmiSimulationActivePageId).toBe(target.id);
			expect(getState().pagesManager.openPage).not.toHaveBeenCalled();
		});
	});
});
