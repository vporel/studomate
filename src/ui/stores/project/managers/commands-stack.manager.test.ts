import Project from "@/schemas/project/project.schema";
import VariablesUpdateCommand from "@/schemas/project/commands/variables-update.command";
import Variable from "@/schemas/variable/variable.schema";
import { ProjectStoreState } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";
import CommandsStackManager from "./commands-stack.manager";

function renameCommand(from: string, to: string) {
	return new VariablesUpdateCommand([{ id: "v1", newData: { mnemonic: to }, oldData: { mnemonic: from } }]);
}

function makeStore(mode: ProjectMode = ProjectMode.DESIGN) {
	const project = new Project("p1", "Projet", "");
	project.variables = [new Variable("v1", "moteur", "memory", "BOOL")];

	let state = {
		project,
		mode,
		hasUnsavedChanges: false,
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		grafcetsManager: { syncMountedStoresFromProject: jest.fn() },
		laddersManager: { syncMountedStoresFromProject: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;
	return { get, set, manager: new CommandsStackManager(set, get) };
}

describe("CommandsStackManager (project)", () => {
	describe("executeOperation", () => {
		it("applique la commande et marque le projet modifié", () => {
			const { get, manager } = makeStore();

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expect(get().project!.variables[0].mnemonic).toBe("pompe");
			expect(get().hasUnsavedChanges).toBe(true);
			expect(get().hasCommandsToUndo).toBe(true);
		});

		// Mécanisme construit en §2.2 : un grafcet ouvert détient sa propre copie et doit
		// adopter le résultat de la commande, sinon il écraserait le renommage à la prochaine
		// synchronisation. Même mécanisme côté ladder (voir Ladder.renameVariableReferences).
		it("resynchronise les stores grafcet et ladder montés", () => {
			const { get, manager } = makeStore();

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expect(get().grafcetsManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
			expect(get().laddersManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
		});

		it("refuse d'exécuter hors du mode conception", () => {
			const { get, manager } = makeStore(ProjectMode.SIMULATION);
			const before = get().project;

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expect(get().project).toBe(before);
			expect(get().grafcetsManager.syncMountedStoresFromProject).not.toHaveBeenCalled();
		});

		it("ne fait rien pour une liste de commandes vide", () => {
			const { get, manager } = makeStore();
			const before = get().project;

			manager.executeOperation([]);

			expect(get().project).toBe(before);
			expect(get().grafcetsManager.syncMountedStoresFromProject).not.toHaveBeenCalled();
		});
	});

	describe("undoOperation", () => {
		it("restaure le mnémonique précédent", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);

			manager.undoOperation();

			expect(get().project!.variables[0].mnemonic).toBe("moteur");
			expect(get().hasCommandsToUndo).toBe(false);
			expect(get().hasCommandsToRedo).toBe(true);
		});

		it("resynchronise les stores grafcet et ladder montés", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);
			(get().grafcetsManager.syncMountedStoresFromProject as jest.Mock).mockClear();
			(get().laddersManager.syncMountedStoresFromProject as jest.Mock).mockClear();

			manager.undoOperation();

			expect(get().grafcetsManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
			expect(get().laddersManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
		});

		it("ne fait rien s'il n'y a rien à annuler", () => {
			const { get, manager } = makeStore();

			manager.undoOperation();

			expect(get().grafcetsManager.syncMountedStoresFromProject).not.toHaveBeenCalled();
		});

		it("refuse d'annuler hors du mode conception", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);
			(get() as any).mode = ProjectMode.SIMULATION;

			manager.undoOperation();

			expect(get().project!.variables[0].mnemonic).toBe("pompe"); // toujours renommé
		});
	});

	describe("redoOperation", () => {
		it("réapplique le renommage annulé", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);
			manager.undoOperation();

			manager.redoOperation();

			expect(get().project!.variables[0].mnemonic).toBe("pompe");
			expect(get().hasCommandsToRedo).toBe(false);
		});

		it("resynchronise les stores grafcet et ladder montés", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);
			manager.undoOperation();
			(get().grafcetsManager.syncMountedStoresFromProject as jest.Mock).mockClear();
			(get().laddersManager.syncMountedStoresFromProject as jest.Mock).mockClear();

			manager.redoOperation();

			expect(get().grafcetsManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
			expect(get().laddersManager.syncMountedStoresFromProject).toHaveBeenCalledTimes(1);
		});
	});

	describe("cycle complet", () => {
		it("exécuter → annuler → rétablir redonne le même résultat", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);

			manager.undoOperation();
			manager.redoOperation();

			expect(get().project!.variables[0].mnemonic).toBe("pompe");
		});
	});
});
