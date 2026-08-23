/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import { toast } from "react-toastify";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/components/pages/ProjectStartupPage";
import { setPagesSession } from "@/ui/lib/pages-session-storage";
import { setActivePageIdInUrl } from "@/ui/lib/pages-url";
import { createProjectStore } from "./project.store";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

describe("createProjectStore", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("starts with no project open", () => {
		const store = createProjectStore();
		expect(store.getState().project).toBeNull();
		expect(store.getState().hasUnsavedChanges).toBe(false);
	});

	describe("newProject", () => {
		it("opens a new project directly when there are no unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			expect(store.getState().project).not.toBeNull();
			expect(store.getState().project?.name).toBe(DEFAULT_PROJECT_NAME);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("asks for confirmation instead when there are unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.setState({ hasUnsavedChanges: true });

			await store.getState().newProject();

			// The new project isn't opened yet, the confirmation dialog is shown instead
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("opens the new project once the pending confirmation is continued", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			const firstProjectId = store.getState().project!.id;
			store.setState({ hasUnsavedChanges: true });

			await store.getState().newProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();
			// The continuation is itself async; let its microtask settle.
			await Promise.resolve();
			await Promise.resolve();

			expect(store.getState().project!.id).not.toBe(firstProjectId);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("setOpenModalVisible", () => {
		it("opens the modal directly when there are no unsaved changes", () => {
			const store = createProjectStore();
			store.getState().setOpenModalVisible(true);
			expect(store.getState().ui.openModalVisible).toBe(true);
		});

		it("can always be closed regardless of unsaved changes", () => {
			const store = createProjectStore();
			store.setState({ hasUnsavedChanges: true, ui: { ...store.getState().ui, openModalVisible: true } });
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
			expect(store.getState().ui.unsavedChangesDialogMessage).toContain("exporter");
		});
	});

	describe("setProjectName / setProjectAuthor", () => {
		it("updates the project name and marks unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();

			store.getState().setProjectName("Mon projet");

			expect(store.getState().project?.name).toBe("Mon projet");
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("does not mark unsaved changes when the name doesn't actually change", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.getState().setProjectName(store.getState().project!.name);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("updates the project author and marks unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.getState().setProjectAuthor("Alice");
			expect(store.getState().project?.author).toBe("Alice");
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});
	});

	describe("saveProject", () => {
		it("persists the project and clears hasUnsavedChanges", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.getState().setProjectName("Projet à sauvegarder");

			const result = await store.getState().saveProject();

			expect(result).toBe(true);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(await store.getState().projectRepository.get(store.getState().project!.id)).not.toBeNull();
		});

		it("expose savingProject à true le temps de la sauvegarde", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.getState().setProjectName("Projet en cours de sauvegarde");

			const savePromise = store.getState().saveProject();

			expect(store.getState().savingProject).toBe(true);
			await savePromise;
			expect(store.getState().savingProject).toBe(false);
		});

		it("does nothing when there is no open project", async () => {
			const store = createProjectStore();
			const result = await store.getState().saveProject();
			expect(result).toBe(false);
		});

		it("quand le repository échoue : retourne false, garde hasUnsavedChanges, et affiche un toast d'erreur", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.getState().setProjectName("Projet non sauvegardable");
			jest.spyOn(store.getState().projectRepository, "save").mockResolvedValue({
				ok: false,
				reason: "unknown",
				cause: new Error("boom"),
			});

			const result = await store.getState().saveProject();

			expect(result).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(store.getState().savingProject).toBe(false);
			expect(toast.error).toHaveBeenCalled();
		});
	});

	describe("setProjectDialect", () => {
		it("traduit les mots-clés d'une expression existante et resynchronise les grafcets montés", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			const grafcet = store.getState().grafcetsManager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)!;
			const syncSpy = jest.spyOn(store.getState().grafcetsManager, "syncMountedStoresFromProject");

			store.getState().setProjectDialect(Dialect.EN);

			expect(store.getState().project!.dialect).toBe(Dialect.EN);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(syncSpy).toHaveBeenCalled();
			expect(store.getState().project!.getGrafcet(grafcet.id)).toBeDefined();
		});

		it("ne fait rien quand le dialecte demandé est déjà le dialecte courant", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
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
			await store.getState().newProject();
			const grafcet = store.getState().grafcetsManager.newGrafcet("G1", DEFAULT_GRAFCET_FORMAT)!;

			store.getState().setActiveScope(grafcet.id);

			expect(store.getState().activeScope).toBe(grafcet.id);
			expect(store.getState().activeScopeType).toBe("grafcet");
		});

		it("retombe sur le scope 'project' pour un scope sans page associée", async () => {
			const store = createProjectStore();
			await store.getState().newProject();

			store.getState().setActiveScope("inexistant");

			expect(store.getState().activeScopeType).toBe("project");
		});

		it("ne re-focalise pas le flow quand le scope demandé est déjà le scope actif", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			const grafcetA = store.getState().grafcetsManager.newGrafcet("A", DEFAULT_GRAFCET_FORMAT)!;
			const grafcetB = store.getState().grafcetsManager.newGrafcet("B", DEFAULT_GRAFCET_FORMAT)!;
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

	describe("closeProject", () => {
		it("closes directly when there are no unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();

			await store.getState().closeProject();

			expect(store.getState().project).toBeNull();
		});

		it("asks for confirmation when there are unsaved changes", async () => {
			const store = createProjectStore();
			await store.getState().newProject();
			store.setState({ hasUnsavedChanges: true });

			await store.getState().closeProject();

			expect(store.getState().project).not.toBeNull();
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
		});
	});

	describe("openProject", () => {
		it("returns false for an unknown project id", async () => {
			const store = createProjectStore();
			const result = await store.getState().openProject("does-not-exist");
			expect(result).toBe(false);
			expect(store.getState().project).toBeNull();
		});

		it("opens a previously saved project", async () => {
			const store = createProjectStore();
			const project = new Project("known-id", "Projet existant", "Author");
			await store.getState().projectRepository.save(project);

			const result = await store.getState().openProject("known-id");

			expect(result).toBe(true);
			expect(store.getState().project?.id).toBe("known-id");
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		describe("restauration des onglets ouverts", () => {
			afterEach(() => {
				window.history.replaceState(null, "", "/");
			});

			it("sans session ni URL, garde la page de démarrage par défaut", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				await store.getState().projectRepository.save(project);

				await store.getState().openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID]);
				expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
			});

			it("rouvre les onglets et la page active mémorisés en session (localStorage)", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				const grafcet = new Grafcet("g1", "Mon grafcet", DEFAULT_GRAFCET_FORMAT);
				project.addProgram(grafcet);
				await store.getState().projectRepository.save(project);
				setPagesSession("p1", { pagesOrder: [PROJECT_STARTUP_PAGE_ID, "g1"], activePageId: "g1" });

				await store.getState().openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID, "g1"]);
				expect(store.getState().activePageId).toBe("g1");
				expect(store.getState().pagesData["g1"]).toMatchObject({ type: "grafcet", title: "Mon grafcet" });
			});

			it("priorise la page active de l'URL (lien partagé) sur celle de la session", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				const grafcetA = new Grafcet("gA", "A", DEFAULT_GRAFCET_FORMAT);
				const grafcetB = new Grafcet("gB", "B", DEFAULT_GRAFCET_FORMAT);
				project.addProgram(grafcetA);
				project.addProgram(grafcetB);
				await store.getState().projectRepository.save(project);
				setPagesSession("p1", { pagesOrder: ["gA", "gB"], activePageId: "gA" });
				setActivePageIdInUrl("gB");

				await store.getState().openProject("p1");

				expect(store.getState().pagesOrder).toEqual(["gA", "gB"]);
				expect(store.getState().activePageId).toBe("gB");
			});

			it("ignore les ids de session qui ne correspondent plus à rien et retombe sur la page de démarrage", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				await store.getState().projectRepository.save(project);
				setPagesSession("p1", { pagesOrder: ["programme-supprime"], activePageId: "programme-supprime" });

				await store.getState().openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID]);
				expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
			});
		});
	});
});
