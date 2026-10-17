/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import { createProjectStore } from "./project.store";
import { getDraft, saveDraft } from "@/persistence/draft.storage";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockTrackEvent(...args),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

/** Ouvre un projet vierge : `newProject()` n'ouvre plus que la modale, c'est `newProjectFromTemplate(null)` qui crée réellement. */
async function openBlankProject(store: ReturnType<typeof createProjectStore>) {
	await store.getState().lifecycleManager.newProjectFromTemplate(null);
}

describe("createProjectStore", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("starts with no project open", () => {
		const store = createProjectStore();
		expect(store.getState().project).toBeNull();
		expect(store.getState().hasUnsavedChanges).toBe(false);
	});

	describe("setOpenModalVisible", () => {
		it("opens the modal directly when there are no unsaved changes", () => {
			const store = createProjectStore();
			store.getState().setOpenModalVisible(true);
			expect(store.getState().ui.openModalVisible).toBe(true);
		});

		it("can always be closed regardless of unsaved changes", () => {
			const store = createProjectStore();
			store.setState({
				hasUnsavedChanges: true,
				ui: { ...store.getState().ui, openModalVisible: true },
			});
			store.getState().setOpenModalVisible(false);
			expect(store.getState().ui.openModalVisible).toBe(false);
		});

		it("asks for confirmation instead of opening when there are unsaved changes", () => {
			const store = createProjectStore();
			store.setState({ hasUnsavedChanges: true });
			store.getState().setOpenModalVisible(true);
			expect(store.getState().ui.openModalVisible).toBe(false);
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
		});
	});

	describe("setExportModalVisible", () => {
		it("opens the modal directly when there are no unsaved changes", () => {
			const store = createProjectStore();
			store.getState().setExportModalVisible(true);
			expect(store.getState().ui.exportModalVisible).toBe(true);
		});

		it("asks for confirmation with an export-specific message when there are unsaved changes", () => {
			const store = createProjectStore();
			store.setState({ hasUnsavedChanges: true });
			store.getState().setExportModalVisible(true);
			expect(store.getState().ui.exportModalVisible).toBe(false);
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
			expect(store.getState().ui.unsavedChangesDialogMessage).toContain(
				"exporter",
			);
		});
	});

	describe("panneaux analyse / références croisées mutuellement exclusifs", () => {
		it("ferme les références croisées à l'ouverture du panneau d'analyse", () => {
			const store = createProjectStore();
			store.getState().setCrossReferenceResultVisible(true);

			store.getState().setAnalysisResultVisible(true);

			expect(store.getState().ui.analysisResultVisible).toBe(true);
			expect(store.getState().ui.crossReferenceResultVisible).toBe(false);
		});

		it("ferme le panneau d'analyse à l'ouverture des références croisées", () => {
			const store = createProjectStore();
			store.getState().setAnalysisResultVisible(true);

			store.getState().setCrossReferenceResultVisible(true);

			expect(store.getState().ui.crossReferenceResultVisible).toBe(true);
			expect(store.getState().ui.analysisResultVisible).toBe(false);
		});

		it("fermer un panneau ne touche pas à l'autre", () => {
			const store = createProjectStore();
			store.getState().setAnalysisResultVisible(true);

			store.getState().setCrossReferenceResultVisible(false);

			expect(store.getState().ui.analysisResultVisible).toBe(true);
		});
	});

	describe("setProjectName / setProjectAuthor", () => {
		it("updates the project name and marks unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);

			store.getState().setProjectName("Mon projet");

			expect(store.getState().project?.name).toBe("Mon projet");
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("does not mark unsaved changes when the name doesn't actually change", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectName(store.getState().project!.name);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("updates the project author and marks unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectAuthor("Alice");
			expect(store.getState().project?.author).toBe("Alice");
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});
	});

	describe("project properties undo", () => {
		it("undoes and redoes the project name", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const original = store.getState().project!.name;
			store.getState().setProjectName("Mon projet");

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project?.name).toBe(original);

			store.getState().commandsStackManager.redoOperation();
			expect(store.getState().project?.name).toBe("Mon projet");
		});

		it("undoes the author", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const original = store.getState().project!.author;
			store.getState().setProjectAuthor("Alice");

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().project?.author).toBe(original);
		});

		it("undoes the exercise statement, including its removal", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setExerciseStatement("Un énoncé");
			store.getState().setExerciseStatement("  ");
			expect(store.getState().project?.exercise).toBeUndefined();

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project?.exercise?.statement).toBe("Un énoncé");

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project?.exercise).toBeUndefined();
		});

		it("undoes the dialect, translating expressions back and resyncing mounted grafcets", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().grafcetsManager.newGrafcet("G1");
			const initial = store.getState().project!.dialect;
			store.getState().setProjectDialect(Dialect.EN);
			const syncSpy = jest.spyOn(
				store.getState().grafcetsManager,
				"syncMountedStoresFromProject",
			);

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().project!.dialect).toBe(initial);
			expect(syncSpy).toHaveBeenCalled();
		});
	});

	describe("setExerciseStatement", () => {
		it("enregistre l'énoncé et marque des changements non sauvegardés", async () => {
			const store = createProjectStore();
			await openBlankProject(store);

			store.getState().setExerciseStatement("## Consignes\n\nFaire X.");

			expect(store.getState().project?.exercise?.statement).toBe(
				"## Consignes\n\nFaire X.",
			);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("retire l'énoncé quand la valeur est vide après trim", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setExerciseStatement("Un énoncé");

			store.getState().setExerciseStatement("   \n  ");

			expect(store.getState().project?.exercise).toBeUndefined();
		});

		it("ne fait rien quand l'énoncé est inchangé", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setExerciseStatement("Stable");
			store.setState({ hasUnsavedChanges: false });
			const projectBefore = store.getState().project;

			store.getState().setExerciseStatement("Stable");

			expect(store.getState().project).toBe(projectBefore);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("setHardwareModel", () => {
		it("sets the target and marks unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: false });

			store.getState().setHardwareModel("arduino-uno-r3");

			expect(store.getState().project?.hardwareTarget).toEqual({
				modelId: "arduino-uno-r3",
			});
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("removes the target with null", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setHardwareModel("arduino-uno-r3");

			store.getState().setHardwareModel(null);

			expect(store.getState().project?.hardwareTarget).toBeNull();
		});

		it("does nothing when the model is unchanged, whether set or absent", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: false });
			const projectBefore = store.getState().project;

			store.getState().setHardwareModel(null);
			expect(store.getState().project).toBe(projectBefore);

			store.getState().setHardwareModel("arduino-uno-r3");
			store.setState({ hasUnsavedChanges: false });
			const projectWithTarget = store.getState().project;
			store.getState().setHardwareModel("arduino-uno-r3");

			expect(store.getState().project).toBe(projectWithTarget);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("does not touch the previous project instance", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const before = store.getState().project!;

			store.getState().setHardwareModel("arduino-uno-r3");

			expect(before.hardwareTarget).toBeUndefined();
		});
	});

	describe("setHardwareTarget", () => {
		it("replaces the target configuration", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setHardwareModel("arduino-uno-r3");
			store.setState({ hasUnsavedChanges: false });

			const next = {
				modelId: "arduino-uno-r3" as const,
				pins: { "%PD2": { mode: "INPUT" as const, inverted: false } },
			};
			store.getState().setHardwareTarget(next);

			expect(store.getState().project?.hardwareTarget).toEqual(next);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("is a no-op without a target", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: false });
			const projectBefore = store.getState().project;

			store.getState().setHardwareTarget({ modelId: "arduino-uno-r3" });

			expect(store.getState().project).toBe(projectBefore);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("setScene3d", () => {
		const scene = {
			sceneId: "carton-sorting",
			sceneVersion: 1,
			bindings: { t1: "v1" },
		};

		it("sets the scene on a copy of the project and marks unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: false });
			const before = store.getState().project!;

			store.getState().setScene3d(scene);

			expect(store.getState().project?.scene3d).toEqual(scene);
			expect(before.scene3d).toBeUndefined();
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("tracks the attachment of a scene, not a rebinding of the same scene nor a removal", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			mockTrackEvent.mockClear();

			store.getState().setScene3d(scene);
			expect(mockTrackEvent).toHaveBeenCalledWith("scene-attached", {
				scene: "carton-sorting",
			});

			mockTrackEvent.mockClear();
			store.getState().setScene3d({ ...scene, bindings: { t1: "v2" } });
			store.getState().setScene3d(null);
			expect(mockTrackEvent).not.toHaveBeenCalled();
		});

		it("tells the scene tab link that the scene changed", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const onSceneChanged = jest.spyOn(
				store.getState().scene3dLinkManager,
				"onSceneChanged",
			);

			store.getState().setScene3d(scene);

			expect(onSceneChanged).toHaveBeenCalledTimes(1);
		});

		it("removes the scene with null", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setScene3d(scene);

			store.getState().setScene3d(null);

			expect(store.getState().project?.scene3d).toBeNull();
		});

		it("is undoable and redoable, and the scene tab link is told each time", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const onSceneChanged = jest.spyOn(
				store.getState().scene3dLinkManager,
				"onSceneChanged",
			);
			store.getState().setScene3d(scene);

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project?.scene3d).toBeNull();
			expect(onSceneChanged).toHaveBeenCalledTimes(2);

			store.getState().commandsStackManager.redoOperation();
			expect(store.getState().project?.scene3d).toEqual(scene);
			expect(onSceneChanged).toHaveBeenCalledTimes(3);
		});

		it("does not notify the scene tab link when a variable operation is undone", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().variablesManager.addVariables([
				{
					mnemonic: "x",
					zone: "memory",
					type: "BOOL",
					address: "",
					comment: "",
				} as never,
			]);
			const onSceneChanged = jest.spyOn(
				store.getState().scene3dLinkManager,
				"onSceneChanged",
			);

			store.getState().commandsStackManager.undoOperation();

			expect(onSceneChanged).not.toHaveBeenCalled();
		});
	});

	describe("hardware configuration undo", () => {
		it("undoes and redoes the model choice", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setHardwareModel("arduino-uno-r3");

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project?.hardwareTarget).toBeNull();

			store.getState().commandsStackManager.redoOperation();
			expect(store.getState().project?.hardwareTarget).toEqual({
				modelId: "arduino-uno-r3",
			});
		});

		it("undoes a pin configuration change back to the previous target", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setHardwareModel("arduino-uno-r3");
			const next = {
				modelId: "arduino-uno-r3" as const,
				pins: { "%PD2": { mode: "INPUT" as const, inverted: false } },
			};
			store.getState().setHardwareTarget(next);

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().project?.hardwareTarget).toEqual({
				modelId: "arduino-uno-r3",
			});
		});

		it("does not touch the board link when undoing", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setHardwareModel("arduino-uno-r3");
			const unlink = jest.spyOn(store.getState().hardwareLinkManager, "unlink");

			store.getState().commandsStackManager.undoOperation();

			expect(unlink).not.toHaveBeenCalled();
		});
	});

	describe("createMissingScene3dVariables", () => {
		it("creates and binds the unbound points, undoable in one step", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store
				.getState()
				.setScene3d({ sceneId: "elevator", sceneVersion: 1, bindings: {} });
			const before = store.getState().project!.variables.length;

			store.getState().createMissingScene3dVariables();

			const { project } = store.getState();
			const bindings = project!.scene3d!.bindings;
			expect(Object.keys(bindings)).toHaveLength(15);
			expect(project!.variables).toHaveLength(before + 15);
			const up = project!.variables.find((v) => v.id === bindings.up)!;
			expect(up).toMatchObject({ mnemonic: "monter", zone: "logic-output" });
			const position = project!.variables.find(
				(v) => v.id === bindings.cabinPosition,
			)!;
			expect(position).toMatchObject({ zone: "analog-input", type: "INT" });

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().project!.variables).toHaveLength(before);
			expect(store.getState().project!.scene3d!.bindings).toEqual({});
		});

		it("does nothing without a scene", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const projectBefore = store.getState().project;

			store.getState().createMissingScene3dVariables();

			expect(store.getState().project).toBe(projectBefore);
		});
	});

	describe("setProjectDialect", () => {
		it("traduit les mots-clés d'une expression existante et resynchronise les grafcets montés", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const grafcet = store.getState().grafcetsManager.newGrafcet("G1")!;
			const syncSpy = jest.spyOn(
				store.getState().grafcetsManager,
				"syncMountedStoresFromProject",
			);

			store.getState().setProjectDialect(Dialect.EN);

			expect(store.getState().project!.dialect).toBe(Dialect.EN);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(syncSpy).toHaveBeenCalled();
			expect(store.getState().project!.getGrafcet(grafcet.id)).toBeDefined();
		});

		it("ne fait rien quand le dialecte demandé est déjà le dialecte courant", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const currentDialect = store.getState().project!.dialect;
			const projectBefore = store.getState().project;

			store.getState().setProjectDialect(currentDialect);

			expect(store.getState().project).toBe(projectBefore);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("setActiveScope", () => {
		it("déduit activeScopeType depuis le type de page (grafcet)", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const grafcet = store.getState().grafcetsManager.newGrafcet("G1")!;

			store.getState().setActiveScope(grafcet.id);

			expect(store.getState().activeScope).toBe(grafcet.id);
			expect(store.getState().activeScopeType).toBe("grafcet");
		});

		it("retombe sur le scope 'project' pour un scope sans page associée", async () => {
			const store = createProjectStore();
			await openBlankProject(store);

			store.getState().setActiveScope("inexistant");

			expect(store.getState().activeScopeType).toBe("project");
		});

		it("ne re-focalise pas le flow quand le scope demandé est déjà le scope actif", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const grafcetA = store.getState().grafcetsManager.newGrafcet("A")!;
			const grafcetB = store.getState().grafcetsManager.newGrafcet("B")!;
			const focusA = jest.fn();
			const focusB = jest.fn();
			store.getState().grafcetsManager.registerStoreManager(grafcetA.id, {
				viewManager: { focus: focusA } as any,
			} as any);
			store.getState().grafcetsManager.registerStoreManager(grafcetB.id, {
				viewManager: { focus: focusB } as any,
			} as any);
			store.getState().setActiveScope(grafcetA.id);
			focusA.mockClear();

			store.getState().setActiveScope(grafcetA.id);
			expect(focusA).not.toHaveBeenCalled();

			store.getState().setActiveScope(grafcetB.id);
			expect(focusB).toHaveBeenCalledTimes(1);
		});
	});

	describe("bootStatus", () => {
		beforeEach(() => {
			window.history.replaceState(null, "", "/");
		});
		afterEach(() => {
			window.history.replaceState(null, "", "/");
		});

		it("est 'idle' au démarrage à froid (aucun id ni token dans l'URL)", () => {
			const store = createProjectStore();
			expect(store.getState().bootStatus).toBe("idle");
		});

		it("est 'restoring' quand l'URL porte un projectId", () => {
			window.history.replaceState(null, "", "/?projectId=p1");
			const store = createProjectStore();
			expect(store.getState().bootStatus).toBe("restoring");
		});

		it("est 'restoring' quand l'URL porte un shareToken", () => {
			window.history.replaceState(null, "", "/?shareToken=abc");
			const store = createProjectStore();
			expect(store.getState().bootStatus).toBe("restoring");
		});

		it("repasse à 'idle' via finishBoot quand la réouverture échoue", async () => {
			window.history.replaceState(null, "", "/?projectId=does-not-exist");
			const store = createProjectStore();

			const opened = await store
				.getState()
				.lifecycleManager.openProject("does-not-exist", true);

			expect(opened).toBe(false);
			expect(store.getState().bootStatus).toBe("restoring");
			store.getState().finishBoot();
			expect(store.getState().bootStatus).toBe("idle");
		});
	});

	describe("abandon des modifications : intercalation du dialogue par les setters de modale", () => {
		async function openProjectWithDraft(
			store: ReturnType<typeof createProjectStore>,
		) {
			await openBlankProject(store);
			const projectId = store.getState().project!.id;
			store.setState({ hasUnsavedChanges: true });
			saveDraft(projectId, "brouillon", JSON.stringify({ id: projectId }));
			return projectId;
		}

		it("supprime le brouillon quand on continue depuis setOpenModalVisible", async () => {
			const store = createProjectStore();
			const projectId = await openProjectWithDraft(store);

			store.getState().setOpenModalVisible(true);
			store.getState().ui.onUnsavedChangesDialogContinue?.();

			expect(getDraft(projectId)).toBeNull();
		});

		it("conserve le brouillon pour l'export (le projet reste ouvert)", async () => {
			const store = createProjectStore();
			const projectId = await openProjectWithDraft(store);

			store.getState().setExportModalVisible(true);
			store.getState().ui.onUnsavedChangesDialogContinue?.();

			expect(getDraft(projectId)).not.toBeNull();
		});
	});
});
