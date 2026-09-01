/** @jest-environment jsdom */
import Grafcet, {
	DEFAULT_GRAFCET_FORMAT,
} from "@/schemas/grafcet/grafcet.schema";
import Project, {
	DEFAULT_PROJECT_NAME,
} from "@/schemas/project/project.schema";
import { toast } from "react-toastify";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/components/pages/ProjectStartupPage";
import { setPagesSession } from "@/ui/lib/pages-session-storage";
import { setActivePageIdInUrl } from "@/ui/lib/pages-url";
import { createProjectStore } from "../project.store";
import { getDraft, saveDraft } from "@/persistence/draft.storage";
import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import { authStore } from "@/ui/stores/auth/auth.store";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

const lifecycle = (store: ReturnType<typeof createProjectStore>) =>
	store.getState().lifecycleManager;

/** Laisse les microtâches en attente (résolution du lieu de stockage, avant l'ouverture de la
 * modale) se dérouler avant d'inspecter l'état, quand `saveProject`/`saveProjectAs` n'est
 * volontairement pas attendu. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Ouvre un projet vierge : `newProject()` n'ouvre plus que la modale, c'est `newProjectFromTemplate(null)` qui crée réellement. */
async function openBlankProject(store: ReturnType<typeof createProjectStore>) {
	await lifecycle(store).newProjectFromTemplate(null);
}

describe("ProjectLifecycleManager", () => {
	beforeEach(() => {
		localStorage.clear();
		// Sans préférence de lieu de stockage, le premier enregistrement d'un projet neuf ouvre
		// la modale de choix (voir `describe("résolution du lieu de stockage")` plus bas) — non
		// pertinent pour la plupart des tests, qui veulent un `saveProject`/`saveProjectAs`
		// silencieux comme avant l'introduction de cette modale.
		setPreferredSaveLocation("local");
	});

	afterEach(() => {
		authStore.setState({
			user: null,
			ui: { authModalVisible: false, authModalPrompt: null },
		});
	});

	describe("newProject", () => {
		it("opens the new-project modal when there are no unsaved changes", async () => {
			const store = createProjectStore();
			await lifecycle(store).newProject();
			expect(store.getState().ui.newProjectModalVisible).toBe(true);
			expect(store.getState().project).toBeNull();
		});

		it("asks for confirmation instead when there are unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			await lifecycle(store).newProject();

			// The modal isn't opened yet, the confirmation dialog is shown instead
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
			expect(store.getState().ui.newProjectModalVisible).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("opens the new-project modal once the pending confirmation is continued", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			await lifecycle(store).newProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();
			await Promise.resolve();

			expect(store.getState().ui.newProjectModalVisible).toBe(true);
		});
	});

	describe("newProjectFromTemplate", () => {
		it("opens a blank project and closes the modal when the template id is null", async () => {
			const store = createProjectStore();
			store.getState().setNewProjectModalVisible(true);

			await lifecycle(store).newProjectFromTemplate(null);

			expect(store.getState().project).not.toBeNull();
			expect(store.getState().project?.name).toBe(DEFAULT_PROJECT_NAME);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(store.getState().ui.newProjectModalVisible).toBe(false);
		});

		it("injecte l'énoncé du template dans le projet, exercice comme solution", async () => {
			const store = createProjectStore();

			await lifecycle(store).newProjectFromTemplate("traffic-light", "exercise");
			expect(store.getState().project?.exercise?.statement).toContain(
				"Feu tricolore",
			);

			await lifecycle(store).newProjectFromTemplate("traffic-light", "solution");
			expect(store.getState().project?.exercise?.statement).toContain(
				"Feu tricolore",
			);
		});
	});

	describe("saveProject", () => {
		it("persists the project and clears hasUnsavedChanges", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectName("Projet à sauvegarder");

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(
				await store
					.getState()
					.projectRepository.get(store.getState().project!.id),
			).not.toBeNull();
		});

		it("expose savingProject à true le temps de la sauvegarde", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectName("Projet en cours de sauvegarde");

			const savePromise = lifecycle(store).saveProject();

			expect(store.getState().savingProject).toBe(true);
			await savePromise;
			expect(store.getState().savingProject).toBe(false);
		});

		it("does nothing when there is no open project", async () => {
			const store = createProjectStore();
			const result = await lifecycle(store).saveProject();
			expect(result).toBe(false);
		});

		it("quand le repository échoue : retourne false, garde hasUnsavedChanges, et affiche un toast d'erreur", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectName("Projet non sauvegardable");
			jest.spyOn(store.getState().projectRepository, "save").mockResolvedValue({
				ok: false,
				reason: "unknown",
				cause: new Error("boom"),
			});

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(store.getState().savingProject).toBe(false);
			expect(toast.error).toHaveBeenCalled();
		});

		it("projet partagé (lecture seule) : ouvre la modale Save As au lieu d'enregistrer", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ isSharedProject: true, hasUnsavedChanges: true });

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(false);
			expect(store.getState().ui.saveAsModalVisible).toBe(true);
		});

		it("conflit cloud : ouvre la modale de conflit au lieu d'un toast, garde hasUnsavedChanges", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.getState().setProjectName("Projet en conflit");
			jest.spyOn(store.getState().projectRepository, "save").mockResolvedValue({
				ok: false,
				reason: "conflict",
			});
			(toast.error as jest.Mock).mockClear();

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(store.getState().ui.cloudConflictModalVisible).toBe(true);
			expect(toast.error).not.toHaveBeenCalled();
		});
	});

	describe("resolveCloudConflict", () => {
		it("'copy' ferme la modale de conflit et ouvre Enregistrer sous, sans toucher au projet", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({
				hasUnsavedChanges: true,
				ui: { ...store.getState().ui, cloudConflictModalVisible: true },
			});
			const projectId = store.getState().project!.id;

			await lifecycle(store).resolveCloudConflict("copy");

			expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
			expect(store.getState().ui.saveAsModalVisible).toBe(true);
			expect(store.getState().project?.id).toBe(projectId);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("'reload' recharge la version distante et efface hasUnsavedChanges", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Version distante", "");
			await store.getState().projectRepository.save(project);
			store.setState({
				project,
				hasUnsavedChanges: true,
				ui: { ...store.getState().ui, cloudConflictModalVisible: true },
			});

			await lifecycle(store).resolveCloudConflict("reload");

			expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(store.getState().project?.id).toBe("p1");
		});
	});

	describe("résolution du lieu de stockage", () => {
		it("aucune préférence : le premier enregistrement ouvre la modale et le choix devient la préférence par défaut", async () => {
			localStorage.clear(); // efface la préférence "local" posée par le beforeEach
			const store = createProjectStore();
			await openBlankProject(store);
			const saveResult = lifecycle(store).saveProject();
			await flushMicrotasks();

			expect(store.getState().ui.saveLocationModalVisible).toBe(true);
			store.getState().ui.onSaveLocationChosen?.("local");

			expect(await saveResult).toBe(true);
			expect(store.getState().ui.saveLocationModalVisible).toBe(false);
			expect(getPreferredSaveLocation()).toBe("local");
		});

		it("préférence déjà connue : n'ouvre jamais la modale", async () => {
			const store = createProjectStore();
			await openBlankProject(store);

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().ui.saveLocationModalVisible).toBe(false);
		});

		it("projet déjà enregistré : Enregistrer reste silencieux même sans préférence", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			await lifecycle(store).saveProject(); // premier enregistrement, avec préférence "local"
			localStorage.removeItem("studomate_preferred_save_location");
			store.getState().setProjectName("Nouveau nom");

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().ui.saveLocationModalVisible).toBe(false);
		});

		it("préférence cloud sans session active : ouvre la modale en repli plutôt que d'échouer", async () => {
			setPreferredSaveLocation("cloud");
			const store = createProjectStore();
			await openBlankProject(store);

			const saveResult = lifecycle(store).saveProject();
			await flushMicrotasks();

			expect(store.getState().ui.saveLocationModalVisible).toBe(true);
			store.getState().ui.onSaveLocationChosen?.(null);

			expect(await saveResult).toBe(false);
			// Choix annulé : la préférence "cloud" n'est pas altérée par ce repli ponctuel
			expect(getPreferredSaveLocation()).toBe("cloud");
		});

		it("annulation depuis la modale : n'enregistre pas, garde hasUnsavedChanges", async () => {
			localStorage.clear();
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			const saveResult = lifecycle(store).saveProject();
			await flushMicrotasks();
			store.getState().ui.onSaveLocationChosen?.(null);

			expect(await saveResult).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(getPreferredSaveLocation()).toBeNull();
		});

		it("s'applique aussi à Enregistrer sous", async () => {
			localStorage.clear();
			const store = createProjectStore();
			await openBlankProject(store);
			const saveResult = lifecycle(store).saveProjectAs("Copie");
			await flushMicrotasks();

			expect(store.getState().ui.saveLocationModalVisible).toBe(true);
			store.getState().ui.onSaveLocationChosen?.("local");

			expect(await saveResult).toBe(true);
			expect(getPreferredSaveLocation()).toBe("local");
		});
	});

	describe("closeProject", () => {
		it("closes directly when there are no unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);

			await lifecycle(store).closeProject();

			expect(store.getState().project).toBeNull();
		});

		it("asks for confirmation when there are unsaved changes", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			await lifecycle(store).closeProject();

			expect(store.getState().project).not.toBeNull();
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
		});
	});

	describe("openProject", () => {
		afterEach(() => {
			window.history.replaceState(null, "", "/");
		});

		it("returns false for an unknown project id", async () => {
			const store = createProjectStore();
			const result = await lifecycle(store).openProject("does-not-exist");
			expect(result).toBe(false);
			expect(store.getState().project).toBeNull();
		});

		it("opens a previously saved project", async () => {
			const store = createProjectStore();
			const project = new Project("known-id", "Projet existant", "Author");
			await store.getState().projectRepository.save(project);

			const result = await lifecycle(store).openProject("known-id");

			expect(result).toBe(true);
			expect(store.getState().project?.id).toBe("known-id");
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("repasse le bootStatus à 'idle' une fois le projet ouvert", async () => {
			window.history.replaceState(null, "", "/?projectId=known-id");
			const store = createProjectStore();
			const project = new Project("known-id", "Projet", "Author");
			await store.getState().projectRepository.save(project);

			await lifecycle(store).openProject("known-id", true);

			expect(store.getState().bootStatus).toBe("idle");
		});

		describe("restauration des onglets ouverts", () => {
			it("sans session ni URL, garde la page de démarrage par défaut", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				await store.getState().projectRepository.save(project);

				await lifecycle(store).openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID]);
				expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
			});

			it("rouvre les onglets et la page active mémorisés en session (localStorage)", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				const grafcet = new Grafcet("g1", "Mon grafcet", DEFAULT_GRAFCET_FORMAT);
				project.addProgram(grafcet);
				await store.getState().projectRepository.save(project);
				setPagesSession("p1", {
					pagesOrder: [PROJECT_STARTUP_PAGE_ID, "g1"],
					activePageId: "g1",
				});

				await lifecycle(store).openProject("p1");

				expect(store.getState().pagesOrder).toEqual([
					PROJECT_STARTUP_PAGE_ID,
					"g1",
				]);
				expect(store.getState().activePageId).toBe("g1");
				expect(store.getState().pagesData["g1"]).toMatchObject({
					type: "grafcet",
					title: "Mon grafcet",
				});
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

				await lifecycle(store).openProject("p1");

				expect(store.getState().pagesOrder).toEqual(["gA", "gB"]);
				expect(store.getState().activePageId).toBe("gB");
			});

			it("ignore les ids de session qui ne correspondent plus à rien et retombe sur la page de démarrage", async () => {
				const store = createProjectStore();
				const project = new Project("p1", "Projet", "Author");
				await store.getState().projectRepository.save(project);
				setPagesSession("p1", {
					pagesOrder: ["programme-supprime"],
					activePageId: "programme-supprime",
				});

				await lifecycle(store).openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID]);
				expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
			});
		});
	});

	describe("resolveDraftConflict", () => {
		it("ne fait rien si la modale n'est pas active", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			await expect(
				lifecycle(store).resolveDraftConflict("draft"),
			).resolves.not.toThrow();
		});

		it("supprime le brouillon et ferme la modale quand le choix est 'real'", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			await store.getState().projectRepository.save(project);
			store.setState({
				project,
				ui: {
					...store.getState().ui,
					draftConflictModal: {
						visible: true,
						projectId: "p1",
						draftData: JSON.stringify(project),
					},
				},
			});

			await lifecycle(store).resolveDraftConflict("real");

			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
		});

		it("ouvre le brouillon et marque hasUnsavedChanges quand le choix est 'draft'", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			const draftData = JSON.stringify(project);
			store.setState({
				project,
				ui: {
					...store.getState().ui,
					draftConflictModal: { visible: true, projectId: "p1", draftData },
				},
			});

			await lifecycle(store).resolveDraftConflict("draft");

			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(store.getState().project?.id).toBe("p1");
		});

		it("affiche un toast et ferme la modale si le brouillon est corrompu", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			store.setState({
				project,
				ui: {
					...store.getState().ui,
					draftConflictModal: {
						visible: true,
						projectId: "p1",
						draftData: "{ invalide",
					},
				},
			});

			await lifecycle(store).resolveDraftConflict("draft");

			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
			expect(toast.error).toHaveBeenCalled();
		});
	});

	describe("abandon des modifications (« continuer sans enregistrer »)", () => {
		async function openProjectWithDraft(
			store: ReturnType<typeof createProjectStore>,
		) {
			await openBlankProject(store);
			const projectId = store.getState().project!.id;
			store.setState({ hasUnsavedChanges: true });
			saveDraft(projectId, "brouillon", JSON.stringify({ id: projectId }));
			return projectId;
		}

		it("supprime le brouillon quand on continue depuis newProject", async () => {
			const store = createProjectStore();
			const projectId = await openProjectWithDraft(store);

			await lifecycle(store).newProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();

			expect(getDraft(projectId)).toBeNull();
		});

		it("supprime le brouillon quand on continue depuis closeProject", async () => {
			const store = createProjectStore();
			const projectId = await openProjectWithDraft(store);

			await lifecycle(store).closeProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();
			await Promise.resolve();

			expect(getDraft(projectId)).toBeNull();
		});
	});
});
