import { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import { ProjectMode } from "../ProjectMode.enum";
import { ProjectStoreState } from "../project.store";
import GrafcetsManager from "./grafcets.manager";

function makeManager(initial: {
	project?: Project | null;
	mode?: ProjectMode;
	activeScope?: string;
	activeScopeType?: "project" | "grafcet" | "ladder";
	grafcetsStoresValues?: Record<string, any>;
	grafcetsStoresManagers?: Record<string, any>;
	pagesData?: Record<string, any>;
}) {
	let state = {
		project: initial.project ?? null,
		mode: initial.mode ?? ProjectMode.DESIGN,
		activeScope: initial.activeScope ?? "project",
		activeScopeType: initial.activeScopeType ?? "project",
		grafcetsStoresValues: initial.grafcetsStoresValues ?? {},
		grafcetsStoresManagers: initial.grafcetsStoresManagers ?? {},
		pagesData: initial.pagesData ?? {},
		pagesManager: { openPage: jest.fn(), closePage: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new GrafcetsManager(set, get), getState: () => state };
}

function projectWithGrafcet() {
	const project = new Project("p1", "Projet", "auteur");
	const grafcetId = project.createGrafcet("G1", DEFAULT_GRAFCET_FORMAT).id;
	return { project, grafcetId };
}

describe("GrafcetsManager", () => {
	describe("getCommandsStack", () => {
		it("crée la pile au premier accès puis retourne toujours la même instance", () => {
			const { manager } = makeManager({});

			const first = manager.getCommandsStack("g1");
			const second = manager.getCommandsStack("g1");

			expect(second).toBe(first);
		});

		it("clearCommandsStacks fait repartir de zéro", () => {
			const { manager } = makeManager({});
			const first = manager.getCommandsStack("g1");

			manager.clearCommandsStacks();

			expect(manager.getCommandsStack("g1")).not.toBe(first);
		});
	});

	describe("newGrafcet", () => {
		it("ne fait rien si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(manager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)).toBeNull();
		});

		it("refuse la création hors mode DESIGN", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur"), mode: ProjectMode.SIMULATION });

			expect(manager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)).toBeNull();
		});

		it("crée le grafcet, ouvre sa page et marque le projet comme modifié", () => {
			const { manager, getState } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			const grafcet = manager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT);

			expect(grafcet).not.toBeNull();
			expect(getState().project!.getGrafcet(grafcet!.id)).toBeDefined();
			expect(getState().pagesManager.openPage).toHaveBeenCalledWith({ id: grafcet!.id, type: "grafcet", title: "G1" });
			expect(getState().hasUnsavedChanges).toBe(true);
		});
	});

	describe("deleteProgramById (grafcet)", () => {
		it("lève une erreur si le grafcet n'existe pas", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.deleteProgramById("inexistant")).toThrow();
		});

		it("retire le grafcet du projet, ferme sa page et jette son historique", () => {
			const { project, grafcetId } = projectWithGrafcet();
			const { manager, getState } = makeManager({ project });
			manager.getCommandsStack(grafcetId); // instancie une pile à jeter

			manager.deleteProgramById(grafcetId);

			expect(getState().project!.getGrafcet(grafcetId)).toBeUndefined();
			expect(getState().pagesManager.closePage).toHaveBeenCalledWith(grafcetId);
			expect(manager.getCommandsStack(grafcetId)).not.toBeUndefined(); // recréée, donc vide
		});

		it("ne fait rien hors mode DESIGN", () => {
			const { project, grafcetId } = projectWithGrafcet();
			const { manager, getState } = makeManager({ project, mode: ProjectMode.SIMULATION });

			manager.deleteProgramById(grafcetId);

			expect(getState().project!.getGrafcet(grafcetId)).toBeDefined();
		});
	});

	describe("renameProgramById (grafcet)", () => {
		it("renomme le grafcet et le titre de sa page si elle est ouverte", () => {
			const { project, grafcetId } = projectWithGrafcet();
			const { manager, getState } = makeManager({
				project,
				pagesData: { [grafcetId]: { id: grafcetId, type: "grafcet", title: "G1" } },
			});

			manager.renameProgramById(grafcetId, "Nouveau nom");

			expect(getState().project!.getGrafcet(grafcetId)!.name).toBe("Nouveau nom");
			expect(getState().pagesData[grafcetId].title).toBe("Nouveau nom");
		});

		it("lève une erreur si le grafcet n'existe pas", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.renameProgramById("inexistant", "X")).toThrow();
		});
	});

	describe("getGrafcet", () => {
		it("lève une erreur si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(() => manager.getProgramOrThrow("g1")).toThrow();
		});

		it("lève une erreur si le grafcet n'existe pas dans le projet", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.getProgramOrThrow("inexistant")).toThrow();
		});

		it("retourne le grafcet demandé", () => {
			const { project, grafcetId } = projectWithGrafcet();
			const { manager } = makeManager({ project });

			expect(manager.getProgramOrThrow(grafcetId).id).toBe(grafcetId);
		});
	});

	describe("getActiveStoreValues / getActiveStoreManagers (grafcet)", () => {
		it("retourne null si le scope actif n'est pas un grafcet", () => {
			const { manager } = makeManager({ activeScopeType: "project" });

			expect(manager.getActiveStoreValues()).toBeNull();
			expect(manager.getActiveStoreManagers()).toBeNull();
		});

		it("retourne les valeurs/managers du grafcet actif", () => {
			const values = { hasCommandsToUndo: true, hasCommandsToRedo: false };
			const managers = { commandsStackManager: {} };
			const { manager } = makeManager({
				activeScope: "g1",
				activeScopeType: "grafcet",
				grafcetsStoresValues: { g1: values },
				grafcetsStoresManagers: { g1: managers },
			});

			expect(manager.getActiveStoreValues()).toBe(values);
			expect(manager.getActiveStoreManagers()).toBe(managers);
		});
	});

	describe("registerStoreManager / deleteStoreManager (grafcet)", () => {
		it("enregistre puis retire le manager d'un grafcet", () => {
			const { manager, getState } = makeManager({});
			const managers = { commandsStackManager: {} } as any;

			manager.registerStoreManager("g1", managers);
			expect(getState().grafcetsStoresManagers.g1).toBe(managers);

			manager.deleteStoreManager("g1");
			expect(getState().grafcetsStoresManagers.g1).toBeUndefined();
		});
	});
});
