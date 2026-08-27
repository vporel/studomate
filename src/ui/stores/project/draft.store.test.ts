/** @jest-environment jsdom */
import Project from "@/schemas/project/project.schema";
import { createProjectStore } from "./project.store";
import * as draftStorage from "@/persistence/draft.storage";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/persistence/draft.storage", () => ({
	saveDraft: jest.fn(),
	getDraft: jest.fn().mockReturnValue(null),
	deleteDraft: jest.fn(),
	getAllDrafts: jest.fn().mockReturnValue([]),
	deleteAllDrafts: jest.fn(),
}));

const mockedGetDraft = draftStorage.getDraft as jest.Mock;
const mockedSaveDraft = draftStorage.saveDraft as jest.Mock;
const mockedDeleteDraft = draftStorage.deleteDraft as jest.Mock;

/** Ouvre un projet vierge : `newProject()` n'ouvre plus que la modale, c'est `newProjectFromTemplate(null)` qui crée réellement. */
async function openBlankProject(store: ReturnType<typeof createProjectStore>) {
	await store.getState().newProjectFromTemplate(null);
}

function projectWithDate(id: string, lastModificationDate: Date): Project {
	const p = new Project(id, "Projet test", "");
	p.lastModificationDate = lastModificationDate;
	return p;
}

describe("store — brouillons", () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
		mockedGetDraft.mockReturnValue(null);
	});

	describe("startAutoSave / stopAutoSave", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("sauvegarde le brouillon toutes les 30 secondes si des modifications existent", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			store.getState().startAutoSave();
			jest.advanceTimersByTime(30_000);

			expect(mockedSaveDraft).toHaveBeenCalledTimes(1);
			expect(mockedSaveDraft).toHaveBeenCalledWith(
				store.getState().project!.id,
				store.getState().project!.name,
				expect.any(String),
			);
			store.getState().stopAutoSave();
		});

		it("ne sauvegarde pas si aucune modification n'est en attente", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			// hasUnsavedChanges est false après ouverture d'un projet vierge

			store.getState().startAutoSave();
			jest.advanceTimersByTime(30_000);

			expect(mockedSaveDraft).not.toHaveBeenCalled();
			store.getState().stopAutoSave();
		});

		it("ne sauvegarde pas si le projet est partagé (lecture seule)", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true, isSharedProject: true });

			store.getState().startAutoSave();
			jest.advanceTimersByTime(30_000);

			expect(mockedSaveDraft).not.toHaveBeenCalled();
			store.getState().stopAutoSave();
		});

		it("stopAutoSave arrête l'intervalle", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			store.getState().startAutoSave();
			store.getState().stopAutoSave();
			jest.advanceTimersByTime(60_000);

			expect(mockedSaveDraft).not.toHaveBeenCalled();
		});

		it("un double appel à startAutoSave ne crée pas deux intervalles", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			store.getState().startAutoSave();
			store.getState().startAutoSave();
			jest.advanceTimersByTime(30_000);

			expect(mockedSaveDraft).toHaveBeenCalledTimes(1);
			store.getState().stopAutoSave();
		});
	});

	describe("saveProject — suppression du brouillon", () => {
		it("supprime le brouillon après un enregistrement réussi", async () => {
			const store = createProjectStore();
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			await store.getState().saveProject();

			expect(mockedDeleteDraft).toHaveBeenCalledWith(
				store.getState().project!.id,
			);
		});
	});

	describe("openProject — ouverture délibérée", () => {
		it("ouvre le projet réel si aucun brouillon n'existe", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			await store.getState().projectRepository.save(project);

			const opened = await store.getState().openProject("p1");

			expect(opened).toBe(true);
			expect(store.getState().project!.id).toBe("p1");
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("supprime silencieusement le brouillon périmé sans afficher de modale", async () => {
			const store = createProjectStore();
			const savedAt = new Date("2024-01-01T10:00:00Z");
			const project = projectWithDate("p1", new Date("2024-01-02T10:00:00Z")); // projet plus récent
			await store.getState().projectRepository.save(project);
			mockedGetDraft.mockReturnValue({
				projectId: "p1",
				projectName: "Projet",
				savedAt: savedAt.getTime(),
				data: JSON.stringify(project),
			});

			await store.getState().openProject("p1");

			expect(mockedDeleteDraft).toHaveBeenCalledWith("p1");
			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
		});

		it("affiche la modale de conflit si le brouillon est plus récent que le projet", async () => {
			const store = createProjectStore();
			const projectDate = new Date("2024-01-01T10:00:00Z");
			const project = projectWithDate("p1", projectDate);
			await store.getState().projectRepository.save(project);
			const draftSavedAt = new Date("2024-01-02T10:00:00Z").getTime(); // brouillon plus récent
			mockedGetDraft.mockReturnValue({
				projectId: "p1",
				projectName: "Projet",
				savedAt: draftSavedAt,
				data: JSON.stringify(project),
			});

			await store.getState().openProject("p1");

			expect(store.getState().ui.draftConflictModal.visible).toBe(true);
			expect(store.getState().ui.draftConflictModal.projectId).toBe("p1");
		});
	});

	describe("openProject — rechargement via URL (preferDraft)", () => {
		it("charge le brouillon en priorité et marque hasUnsavedChanges", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			await store.getState().projectRepository.save(project);
			mockedGetDraft.mockReturnValue({
				projectId: "p1",
				projectName: "Projet brouillon",
				savedAt: Date.now(),
				data: JSON.stringify(project),
			});

			await store.getState().openProject("p1", true);

			expect(store.getState().project!.id).toBe("p1");
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("se rabat sur le projet réel si le brouillon est corrompu", async () => {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			await store.getState().projectRepository.save(project);
			mockedGetDraft.mockReturnValue({
				projectId: "p1",
				projectName: "Projet",
				savedAt: Date.now(),
				data: "{ json invalide",
			});

			const opened = await store.getState().openProject("p1", true);

			expect(opened).toBe(true);
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("resolveDraftConflict", () => {
		async function storeAvecConflitActif() {
			const store = createProjectStore();
			const project = new Project("p1", "Projet", "");
			const draftData = JSON.stringify(project);
			await store.getState().projectRepository.save(project);
			store.setState({
				project,
				ui: {
					...store.getState().ui,
					draftConflictModal: { visible: true, projectId: "p1", draftData },
				},
			});
			return { store, draftData };
		}

		it("ouvre le brouillon et marque hasUnsavedChanges si le choix est 'draft'", async () => {
			const { store } = await storeAvecConflitActif();

			await store.getState().resolveDraftConflict("draft");

			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("supprime le brouillon et ferme la modale si le choix est 'real'", async () => {
			const { store } = await storeAvecConflitActif();

			await store.getState().resolveDraftConflict("real");

			expect(store.getState().ui.draftConflictModal.visible).toBe(false);
			expect(mockedDeleteDraft).toHaveBeenCalledWith("p1");
		});
	});
});
