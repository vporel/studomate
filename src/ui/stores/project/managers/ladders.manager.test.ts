import Project from "@/schemas/project/project.schema";
import { ProjectMode } from "../ProjectMode.enum";
import { ProjectStoreState } from "../project.store";
import LaddersManager from "./ladders.manager";

function makeManager(initial: {
	project?: Project | null;
	mode?: ProjectMode;
	activeScope?: string;
	activeScopeType?: "project" | "grafcet" | "ladder";
	laddersStoresValues?: Record<string, any>;
	laddersStoresManagers?: Record<string, any>;
	pagesData?: Record<string, any>;
}) {
	let state = {
		project: initial.project ?? null,
		mode: initial.mode ?? ProjectMode.DESIGN,
		activeScope: initial.activeScope ?? "project",
		activeScopeType: initial.activeScopeType ?? "project",
		laddersStoresValues: initial.laddersStoresValues ?? {},
		laddersStoresManagers: initial.laddersStoresManagers ?? {},
		pagesData: initial.pagesData ?? {},
		pagesManager: { openPage: jest.fn(), closePage: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new LaddersManager(set, get), getState: () => state };
}

function projectWithLadder() {
	const project = new Project("p1", "Projet", "auteur");
	const ladderId = project.createLadder("L1").id;
	return { project, ladderId };
}

describe("LaddersManager", () => {
	describe("getCommandsStack", () => {
		it("crée la pile au premier accès puis retourne toujours la même instance", () => {
			const { manager } = makeManager({});

			const first = manager.getCommandsStack("l1");
			const second = manager.getCommandsStack("l1");

			expect(second).toBe(first);
		});

		it("clearCommandsStacks fait repartir de zéro", () => {
			const { manager } = makeManager({});
			const first = manager.getCommandsStack("l1");

			manager.clearCommandsStacks();

			expect(manager.getCommandsStack("l1")).not.toBe(first);
		});
	});

	describe("newLadder", () => {
		it("ne fait rien si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(manager.newLadder("L1")).toBeNull();
		});

		it("refuse la création hors mode DESIGN", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur"), mode: ProjectMode.SIMULATION });

			expect(manager.newLadder("L1")).toBeNull();
		});

		it("crée le ladder, ouvre sa page et marque le projet comme modifié", () => {
			const { manager, getState } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			const ladder = manager.newLadder("L1");

			expect(ladder).not.toBeNull();
			expect(getState().project!.getLadder(ladder!.id)).toBeDefined();
			expect(getState().pagesManager.openPage).toHaveBeenCalledWith({ id: ladder!.id, type: "ladder", title: "L1" });
			expect(getState().hasUnsavedChanges).toBe(true);
		});
	});

	describe("deleteLadder", () => {
		it("lève une erreur si le ladder n'existe pas", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.deleteLadder("inexistant")).toThrow();
		});

		it("retire le ladder du projet, ferme sa page et jette son historique", () => {
			const { project, ladderId } = projectWithLadder();
			const { manager, getState } = makeManager({ project });
			manager.getCommandsStack(ladderId); // instancie une pile à jeter

			manager.deleteLadder(ladderId);

			expect(getState().project!.getLadder(ladderId)).toBeUndefined();
			expect(getState().pagesManager.closePage).toHaveBeenCalledWith(ladderId);
			expect(manager.getCommandsStack(ladderId)).not.toBeUndefined(); // recréée, donc vide
		});

		it("ne fait rien hors mode DESIGN", () => {
			const { project, ladderId } = projectWithLadder();
			const { manager, getState } = makeManager({ project, mode: ProjectMode.SIMULATION });

			manager.deleteLadder(ladderId);

			expect(getState().project!.getLadder(ladderId)).toBeDefined();
		});
	});

	describe("renameLadder", () => {
		it("renomme le ladder et le titre de sa page si elle est ouverte", () => {
			const { project, ladderId } = projectWithLadder();
			const { manager, getState } = makeManager({
				project,
				pagesData: { [ladderId]: { id: ladderId, type: "ladder", title: "L1" } },
			});

			manager.renameLadder(ladderId, "Nouveau nom");

			expect(getState().project!.getLadder(ladderId)!.name).toBe("Nouveau nom");
			expect(getState().pagesData[ladderId].title).toBe("Nouveau nom");
		});

		it("lève une erreur si le ladder n'existe pas", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.renameLadder("inexistant", "X")).toThrow();
		});
	});

	describe("getLadder", () => {
		it("lève une erreur si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(() => manager.getLadder("l1")).toThrow();
		});

		it("lève une erreur si le ladder n'existe pas dans le projet", () => {
			const { manager } = makeManager({ project: new Project("p1", "Projet", "auteur") });

			expect(() => manager.getLadder("inexistant")).toThrow();
		});

		it("retourne le ladder demandé", () => {
			const { project, ladderId } = projectWithLadder();
			const { manager } = makeManager({ project });

			expect(manager.getLadder(ladderId).id).toBe(ladderId);
		});
	});

	describe("getActiveLadderStoreValues / getActiveLadderStoreManagers", () => {
		it("retourne null si le scope actif n'est pas un ladder", () => {
			const { manager } = makeManager({ activeScopeType: "project" });

			expect(manager.getActiveLadderStoreValues()).toBeNull();
			expect(manager.getActiveLadderStoreManagers()).toBeNull();
		});

		it("retourne les valeurs/managers du ladder actif", () => {
			const values = { hasCommandsToUndo: true, hasCommandsToRedo: false };
			const managers = { commandsStackManager: {} };
			const { manager } = makeManager({
				activeScope: "l1",
				activeScopeType: "ladder",
				laddersStoresValues: { l1: values },
				laddersStoresManagers: { l1: managers },
			});

			expect(manager.getActiveLadderStoreValues()).toBe(values);
			expect(manager.getActiveLadderStoreManagers()).toBe(managers);
		});
	});

	describe("registerLadderStoreManager / deleteLadderStoreManager", () => {
		it("enregistre puis retire le manager d'un ladder", () => {
			const { manager, getState } = makeManager({});
			const managers = { commandsStackManager: {} } as any;

			manager.registerLadderStoreManager("l1", managers);
			expect(getState().laddersStoresManagers.l1).toBe(managers);

			manager.deleteLadderStoreManager("l1");
			expect(getState().laddersStoresManagers.l1).toBeUndefined();
		});
	});
});
