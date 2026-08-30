/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import { createProjectStore } from "./project.store";
import { getDraft, saveDraft } from "@/persistence/draft.storage";

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

	describe("setProjectDialect", () => {
		it("traduit les mots-clés d'une expression existante et resynchronise les grafcets montés", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			const grafcet = store
				.getState()
				.grafcetsManager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)!;
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
			const grafcet = store
				.getState()
				.grafcetsManager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)!;

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
			const grafcetA = store
				.getState()
				.grafcetsManager.newGrafcet("A", DEFAULT_GRAFCET_FORMAT)!;
			const grafcetB = store
				.getState()
				.grafcetsManager.newGrafcet("B", DEFAULT_GRAFCET_FORMAT)!;
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
