import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetCommandsStackManager from "@/ui/stores/grafcet/managers/commands-stack.manager";
import HmiCommandsStackManager from "@/ui/stores/hmi/managers/commands-stack.manager";
import LadderCommandsStackManager from "@/ui/stores/ladder/managers/commands-stack.manager";
import { Dialect } from "@/expression-language/dialect.enum";
import Project from "@/schemas/project/project.schema";
import ProjectFieldSetCommand from "@/schemas/project/commands/project-field-set.command";
import VariablesUpdateCommand from "@/schemas/project/commands/variables-update.command";
import Variable from "@/schemas/variable/variable.schema";
import { ProjectStoreState } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";
import ProjectCommandsStackManager from "./commands-stack.manager";

function renameCommand(from: string, to: string) {
	return new VariablesUpdateCommand([
		{ id: "v1", newData: { mnemonic: to }, oldData: { mnemonic: from } },
	]);
}

const SCENE = { sceneId: "carton-sorting", sceneVersion: 1, bindings: {} };

function sceneCommand() {
	return new ProjectFieldSetCommand({
		field: "scene3d",
		newValue: SCENE,
		oldValue: undefined,
	});
}

function makeStore(mode: ProjectMode = ProjectMode.DESIGN) {
	const project = new Project("p1", "Projet", "");
	project.variables = [
		new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		}),
	];

	let state = {
		project,
		mode,
		hasUnsavedChanges: false,
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		grafcetsManager: {
			syncMountedStoresFromProject: jest.fn(),
			clearCommandsStacksOf: jest.fn(),
		},
		laddersManager: {
			syncMountedStoresFromProject: jest.fn(),
			clearCommandsStacksOf: jest.fn(),
		},
		hmiManager: {
			syncMountedStoresFromProject: jest.fn(),
			clearCommandsStacksOf: jest.fn(),
		},
		scene3dLinkManager: { onSceneChanged: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;
	return { get, set, manager: new ProjectCommandsStackManager(set, get) };
}

describe("ProjectCommandsStackManager (project)", () => {
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
		it("resynchronise les stores HMI montés", () => {
			const { get, manager } = makeStore();
			manager.executeOperation([renameCommand("moteur", "pompe")]);
			expect(get().hmiManager.syncMountedStoresFromProject).toHaveBeenCalled();
		});

		it("resynchronise les stores grafcet et ladder montés", () => {
			const { get, manager } = makeStore();

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
			expect(
				get().laddersManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
		});

		it("refuse d'exécuter hors du mode conception", () => {
			const { get, manager } = makeStore(ProjectMode.SIMULATION);
			const before = get().project;

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expect(get().project).toBe(before);
			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).not.toHaveBeenCalled();
		});

		it("ne fait rien pour une liste de commandes vide", () => {
			const { get, manager } = makeStore();
			const before = get().project;

			manager.executeOperation([]);

			expect(get().project).toBe(before);
			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).not.toHaveBeenCalled();
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
			(
				get().grafcetsManager.syncMountedStoresFromProject as jest.Mock
			).mockClear();
			(
				get().laddersManager.syncMountedStoresFromProject as jest.Mock
			).mockClear();

			manager.undoOperation();

			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
			expect(
				get().laddersManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
		});

		it("ne fait rien s'il n'y a rien à annuler", () => {
			const { get, manager } = makeStore();

			manager.undoOperation();

			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).not.toHaveBeenCalled();
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
			(
				get().grafcetsManager.syncMountedStoresFromProject as jest.Mock
			).mockClear();
			(
				get().laddersManager.syncMountedStoresFromProject as jest.Mock
			).mockClear();

			manager.redoOperation();

			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
			expect(
				get().laddersManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(1);
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

	describe("scene 3D notification", () => {
		it("notifies when a command changes the scene, on execute, undo and redo", () => {
			const { get, manager } = makeStore();
			const notify = get().scene3dLinkManager.onSceneChanged as jest.Mock;

			manager.executeOperation([sceneCommand()]);
			expect(notify).toHaveBeenCalledTimes(1);

			manager.undoOperation();
			expect(notify).toHaveBeenCalledTimes(2);

			manager.redoOperation();
			expect(notify).toHaveBeenCalledTimes(3);
		});

		it("does not notify when the scene is untouched, on execute, undo and redo", () => {
			const { get, manager } = makeStore();
			const notify = get().scene3dLinkManager.onSceneChanged as jest.Mock;

			manager.executeOperation([renameCommand("moteur", "pompe")]);
			manager.undoOperation();
			manager.redoOperation();

			expect(notify).not.toHaveBeenCalled();
		});

		it("notifies when the project is renamed, on execute, undo and redo", () => {
			const { get, manager } = makeStore();
			const notify = get().scene3dLinkManager.onSceneChanged as jest.Mock;

			manager.executeOperation([
				new ProjectFieldSetCommand({
					field: "name",
					newValue: "Renamed",
					oldValue: "Projet",
				}),
			]);
			expect(get().project!.name).toBe("Renamed");
			expect(notify).toHaveBeenCalledTimes(1);

			manager.undoOperation();
			expect(notify).toHaveBeenCalledTimes(2);

			manager.redoOperation();
			expect(notify).toHaveBeenCalledTimes(3);
		});

		it("does not notify for a field touching neither the name nor the scene", () => {
			const { get, manager } = makeStore();
			const notify = get().scene3dLinkManager.onSceneChanged as jest.Mock;

			manager.executeOperation([
				new ProjectFieldSetCommand({
					field: "author",
					newValue: "Someone",
					oldValue: "",
				}),
			]);

			expect(notify).not.toHaveBeenCalled();
		});

		it("syncs the mounted stores when the scene changes", () => {
			const { get, manager } = makeStore();

			manager.executeOperation([sceneCommand()]);
			manager.undoOperation();

			expect(
				get().grafcetsManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(2);
			expect(
				get().laddersManager.syncMountedStoresFromProject,
			).toHaveBeenCalledTimes(2);
		});
	});

	describe("history of the programs rewritten by a rename", () => {
		let spy: jest.SpyInstance;
		beforeEach(() => {
			//Stands for the rewriting of the programs referencing the renamed variable: only
			//"G1", "L1" and "Page 1" are touched, toggling so that undo/redo rewrite them too.
			spy = jest
				.spyOn(Project.prototype, "renameMnemonicReferences")
				.mockImplementation(function (this: Project) {
					const toggle = (item: { name: string }) => {
						item.name = item.name.endsWith("*")
							? item.name.slice(0, -1)
							: item.name + "*";
					};
					Object.values(this.grafcets)
						.filter((g) => g.name === "G1" || g.name === "G1*")
						.forEach(toggle);
					Object.values(this.ladders)
						.filter((l) => l.name === "L1" || l.name === "L1*")
						.forEach(toggle);
					Object.values(this.hmiPages)
						.filter((p) => p.name === "Page 1" || p.name === "Page 1*")
						.forEach(toggle);
				});
		});
		afterEach(() => spy.mockRestore());

		function setup() {
			const store = makeStore();
			const project = store.get().project!;
			const rewritten = {
				grafcet: project.createGrafcet("G1").id,
				ladder: project.createLadder("L1").id,
				page: project.createHmiPage("Page 1").id,
			};
			const untouched = {
				grafcet: project.createGrafcet("G2").id,
				ladder: project.createLadder("L2").id,
				page: project.createHmiPage("Page 2").id,
			};
			return { ...store, rewritten, untouched };
		}

		function expectCleared(
			get: () => ProjectStoreState,
			ids: { grafcet: string; ladder: string; page: string },
			times: number,
		) {
			const clearGrafcets = get().grafcetsManager.clearCommandsStacksOf as jest.Mock;
			const clearLadders = get().laddersManager.clearCommandsStacksOf as jest.Mock;
			const clearPages = get().hmiManager.clearCommandsStacksOf as jest.Mock;
			expect(clearGrafcets).toHaveBeenCalledTimes(times);
			expect(clearGrafcets).toHaveBeenLastCalledWith([ids.grafcet]);
			expect(clearLadders).toHaveBeenLastCalledWith([ids.ladder]);
			expect(clearPages).toHaveBeenLastCalledWith([ids.page]);
		}

		it("clears only the rewritten programs when a variable is renamed", () => {
			const { get, manager, rewritten } = setup();

			manager.executeOperation([renameCommand("moteur", "pompe")]);

			expectCleared(get, rewritten, 1);
		});

		it("clears them again when the rename is undone and redone", () => {
			const { get, manager, rewritten } = setup();
			manager.executeOperation([renameCommand("moteur", "pompe")]);

			manager.undoOperation();
			expectCleared(get, rewritten, 2);

			manager.redoOperation();
			expectCleared(get, rewritten, 3);
		});

		it("clears nothing when the update does not change a mnemonic", () => {
			const { get, manager } = setup();

			manager.executeOperation([
				new VariablesUpdateCommand([
					{ id: "v1", newData: { comment: "c" }, oldData: { comment: "" } },
				]),
			]);

			expect(get().grafcetsManager.clearCommandsStacksOf).not.toHaveBeenCalled();
			expect(get().laddersManager.clearCommandsStacksOf).not.toHaveBeenCalled();
			expect(get().hmiManager.clearCommandsStacksOf).not.toHaveBeenCalled();
		});
	});

	describe("refreshFlags of the mounted store managers", () => {
		it.each([
			["grafcet", GrafcetCommandsStackManager],
			["ladder", LadderCommandsStackManager],
			["hmi", HmiCommandsStackManager],
		])("%s: flags become false once the stack is cleared", (_, Manager) => {
			const stack = new CommandsStack<any>();
			stack.commandsToUndo.push([{} as any]);
			stack.commandsToRedo.push([{} as any]);
			let state = { hasCommandsToUndo: true, hasCommandsToRedo: true };
			const set = (partial: any) => {
				state = { ...state, ...partial(state) };
			};
			const manager = new (Manager as any)(set, () => state, stack);

			stack.clear();
			manager.refreshFlags();

			expect(state).toEqual({
				hasCommandsToUndo: false,
				hasCommandsToRedo: false,
			});
		});
	});
});
