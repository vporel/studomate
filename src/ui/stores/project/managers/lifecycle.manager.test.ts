/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project, {
	DEFAULT_PROJECT_NAME,
	PROJECT_SCHEMA_VERSION,
} from "@/schemas/project/project.schema";
import { toast } from "react-toastify";
import { setPagesSession } from "@/persistence/pages-session.storage";
import { setActivePageIdInUrl } from "@/ui/stores/project/url/pages-url";
import createAppProjectStoreEnvironment from "../environment/app-project-store-environment";
import { createProjectStore } from "../project.store";
import { getDraft, saveDraft } from "@/persistence/draft.storage";
import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import {
	getProjectIdFromUrl,
	getShareTokenFromUrl,
	setShareTokenInUrl,
} from "@/ui/stores/project/url/project-url";
import { authStore } from "@/ui/stores/auth/auth.store";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/stores/project/pages-data";

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

	describe("scene 3D tab", () => {
		it("is closed when another project is opened", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			const close = jest.spyOn(store.getState().scene3dLinkManager, "close");

			await openBlankProject(store);

			expect(close).toHaveBeenCalled();
		});

		it("is closed when the project is closed", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			const close = jest.spyOn(store.getState().scene3dLinkManager, "close");

			await lifecycle(store).closeProject();

			expect(close).toHaveBeenCalled();
		});
	});

	describe("newProject", () => {
		it("opens the new-project modal when there are no unsaved changes", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await lifecycle(store).newProject();
			expect(store.getState().ui.newProjectModalVisible).toBe(true);
			expect(store.getState().project).toBeNull();
		});

		it("asks for confirmation instead when there are unsaved changes", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			store.setState({ hasUnsavedChanges: true });

			await lifecycle(store).newProject();

			// The modal isn't opened yet, the confirmation dialog is shown instead
			expect(store.getState().ui.unsavedChangesDialogVisible).toBe(true);
			expect(store.getState().ui.newProjectModalVisible).toBe(false);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("opens the new-project modal once the pending confirmation is continued", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			store.getState().setNewProjectModalVisible(true);

			await lifecycle(store).newProjectFromTemplate(null);

			expect(store.getState().project).not.toBeNull();
			expect(store.getState().project?.name).toBe(DEFAULT_PROJECT_NAME);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(store.getState().ui.newProjectModalVisible).toBe(false);
		});

		it("injecte l'énoncé du template dans le projet, exercice comme solution", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());

			await lifecycle(store).newProjectFromTemplate(
				"traffic-light",
				"exercise",
			);
			expect(store.getState().project?.exercise?.statement).toContain(
				"Feu tricolore",
			);

			await lifecycle(store).newProjectFromTemplate(
				"traffic-light",
				"solution",
			);
			expect(store.getState().project?.exercise?.statement).toContain(
				"Feu tricolore",
			);
		});

		it("crée le projet dans la langue demandée : mnémoniques anglais et dialecte EN", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());

			await lifecycle(store).newProjectFromTemplate(
				"traffic-light",
				"solution",
				"en",
			);

			const project = store.getState().project!;
			expect(project.dialect).toBe(Dialect.EN);
			expect(project.variables.map((v) => v.mnemonic)).toEqual([
				"red",
				"amber",
				"green",
			]);
		});

		it("garde les mnémoniques français en français", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());

			await lifecycle(store).newProjectFromTemplate(
				"traffic-light",
				"solution",
				"fr",
			);

			const project = store.getState().project!;
			expect(project.dialect).toBe(Dialect.FR);
			expect(project.variables.map((v) => v.mnemonic)).toContain("rouge");
		});

		it("respecte keepMnemonics du template (carton-sorting garde dcy)", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());

			await lifecycle(store).newProjectFromTemplate(
				"carton-sorting",
				"solution",
				"en",
			);

			const mnemonics = store
				.getState()
				.project!.variables.map((v) => v.mnemonic);
			expect(mnemonics).toContain("dcy");
			expect(mnemonics).not.toContain("cycle_start");
		});
	});

	describe("newProjectFromHandoff", () => {
		const NO_PAGES = { pagesOrder: [], activePageId: null };

		it("opens the project as given, unsaved, with the statement of its template", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("handoff-1", "Mon travail", "");

			await lifecycle(store).newProjectFromHandoff(
				project,
				"traffic-light",
				"fr",
				NO_PAGES,
			);

			expect(store.getState().project).toBe(project);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(project.exercise?.statement).toContain("Feu tricolore");
			expect(getProjectIdFromUrl()).toBe("handoff-1");
		});

		it("adds no statement when the project comes from no template", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("handoff-2", "Libre", "");

			await lifecycle(store).newProjectFromHandoff(
				project,
				null,
				"fr",
				NO_PAGES,
			);

			expect(project.exercise).toBeFalsy();
		});

		it("opens the tabs of the page it comes from, on the active one", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("handoff-3", "Travail", "");
			const g1 = project.createGrafcet("G1");
			const g2 = project.createGrafcet("G2");

			await lifecycle(store).newProjectFromHandoff(project, null, "fr", {
				pagesOrder: [g1.id, g2.id],
				activePageId: g2.id,
			});

			expect(store.getState().pagesOrder).toEqual([g1.id, g2.id]);
			expect(store.getState().activePageId).toBe(g2.id);
		});

		it("skips the tabs that mean nothing in the application", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("handoff-4", "Travail", "");
			const g1 = project.createGrafcet("G1");

			await lifecycle(store).newProjectFromHandoff(project, null, "fr", {
				pagesOrder: ["embedded-scene3d", g1.id, "deleted"],
				activePageId: "embedded-scene3d",
			});

			expect(store.getState().pagesOrder).toEqual([g1.id]);
			expect(store.getState().activePageId).toBe(g1.id);
		});

		it("falls back to the startup page when no tab can be opened", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("handoff-5", "Travail", "");

			await lifecycle(store).newProjectFromHandoff(project, null, "fr", {
				pagesOrder: ["embedded-variables"],
				activePageId: "embedded-variables",
			});

			expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
		});
	});

	describe("saveProject", () => {
		it("persists the project and clears hasUnsavedChanges", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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

		it("nominal save: the store holds the saved copy and the draft is deleted", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			const original = store.getState().project!;
			store.setState({ hasUnsavedChanges: true });
			saveDraft(original.id, original.name, JSON.stringify(original));

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().project).not.toBe(original);
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(getDraft(original.id)).toBeNull();
		});

		it("edits made during the repository save are kept: project, unsaved flag and draft", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			const original = store.getState().project!;
			store.setState({ hasUnsavedChanges: true });
			saveDraft(original.id, original.name, JSON.stringify(original));
			const edited = original.copy();
			edited.name = "Modifié pendant l'envoi";
			jest
				.spyOn(store.getState().projectRepository, "save")
				.mockImplementation(async () => {
					store.setState({ project: edited });
					return { ok: true } as never;
				});

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().project).toBe(edited);
			expect(store.getState().hasUnsavedChanges).toBe(true);
			expect(store.getState().savingProject).toBe(false);
			expect(getDraft(original.id)).not.toBeNull();
		});

		it("expose savingProject à true le temps de la sauvegarde", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			store.getState().setProjectName("Projet en cours de sauvegarde");

			const savePromise = lifecycle(store).saveProject();

			expect(store.getState().savingProject).toBe(true);
			await savePromise;
			expect(store.getState().savingProject).toBe(false);
		});

		it("does nothing when there is no open project", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const result = await lifecycle(store).saveProject();
			expect(result).toBe(false);
		});

		it("quand le repository échoue : retourne false, garde hasUnsavedChanges, et affiche un toast d'erreur", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			store.setState({ isSharedProject: true, hasUnsavedChanges: true });

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(false);
			expect(store.getState().ui.saveAsModalVisible).toBe(true);
		});

		it("conflit cloud : ouvre la modale de conflit au lieu d'un toast, garde hasUnsavedChanges", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);

			const result = await lifecycle(store).saveProject();

			expect(result).toBe(true);
			expect(store.getState().ui.saveLocationModalVisible).toBe(false);
		});

		it("projet déjà enregistré : Enregistrer reste silencieux même sans préférence", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			const saveResult = lifecycle(store).saveProjectAs("Copie");
			await flushMicrotasks();

			expect(store.getState().ui.saveLocationModalVisible).toBe(true);
			store.getState().ui.onSaveLocationChosen?.("local");

			expect(await saveResult).toBe(true);
			expect(getPreferredSaveLocation()).toBe("local");
		});
	});

	describe("token de partage dans l'URL", () => {
		beforeEach(() => setShareTokenInUrl("tok-1"));

		it("est retiré à l'ouverture d'un autre projet", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			expect(getShareTokenFromUrl()).toBeNull();
		});

		it("est retiré par Enregistrer sous", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			setShareTokenInUrl("tok-1");
			expect(await lifecycle(store).saveProjectAs("Copie")).toBe(true);
			expect(getShareTokenFromUrl()).toBeNull();
		});

		it("est retiré à la fermeture du projet", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			setShareTokenInUrl("tok-1");
			await lifecycle(store).closeProject();
			expect(getShareTokenFromUrl()).toBeNull();
		});
	});

	describe("closeProject", () => {
		it("closes directly when there are no unsaved changes", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);

			await lifecycle(store).closeProject();

			expect(store.getState().project).toBeNull();
		});

		it("asks for confirmation when there are unsaved changes", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const result = await lifecycle(store).openProject("does-not-exist");
			expect(result).toBe(false);
			expect(store.getState().project).toBeNull();
		});

		it("opens a previously saved project", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("known-id", "Projet existant", "Author");
			await store.getState().projectRepository.save(project);

			const result = await lifecycle(store).openProject("known-id");

			expect(result).toBe(true);
			expect(store.getState().project?.id).toBe("known-id");
			expect(store.getState().hasUnsavedChanges).toBe(false);
		});

		it("repasse le bootStatus à 'idle' une fois le projet ouvert", async () => {
			window.history.replaceState(null, "", "/?projectId=known-id");
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("known-id", "Projet", "Author");
			await store.getState().projectRepository.save(project);

			await lifecycle(store).openProject("known-id", true);

			expect(store.getState().bootStatus).toBe("idle");
		});

		describe("rechargement via URL avec brouillon (preferDraft)", () => {
			it("restaure le brouillon sans modale quand il est plus récent que le projet enregistré", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "");
				project.lastModificationDate = new Date(0);
				await store.getState().projectRepository.save(project);
				const draft = new Project("p1", "Projet modifié", "");
				saveDraft("p1", draft.name, JSON.stringify(draft));

				const result = await lifecycle(store).openProject("p1", true);

				expect(result).toBe(true);
				expect(store.getState().ui.draftConflictModal.visible).toBe(false);
				expect(store.getState().project?.name).toBe("Projet modifié");
				expect(store.getState().hasUnsavedChanges).toBe(true);
			});

			it("ouvre la modale de conflit quand le projet enregistré est plus récent que le brouillon", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "");
				project.lastModificationDate = new Date(Date.now() + 60_000);
				await store.getState().projectRepository.save(project);
				const draft = new Project("p1", "Projet modifié", "");
				saveDraft("p1", draft.name, JSON.stringify(draft));

				const result = await lifecycle(store).openProject("p1", true);

				expect(result).toBe(true);
				expect(store.getState().ui.draftConflictModal).toEqual({
					visible: true,
					projectId: "p1",
					draftData: JSON.stringify(draft),
				});
				expect(store.getState().bootStatus).toBe("idle");
				expect(store.getState().project).toBeNull();
			});

			it("lit le projet enregistré pour réamorcer la version, permettant l'enregistrement sans faux conflit", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const getSpy = jest.spyOn(store.getState().projectRepository, "get");
				const project = new Project("p1", "Projet", "");
				project.lastModificationDate = new Date(0);
				await store.getState().projectRepository.save(project);
				const draft = new Project("p1", "Projet modifié", "");
				saveDraft("p1", draft.name, JSON.stringify(draft));

				await lifecycle(store).openProject("p1", true);
				expect(getSpy).toHaveBeenCalledWith("p1");

				const saved = await lifecycle(store).saveProject();
				expect(saved).toBe(true);
				expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
			});

			describe("brouillon ouvert sans lecture du projet enregistré", () => {
				const setup = (reRead: Project | null) => {
					const store = createProjectStore(createAppProjectStoreEnvironment());
					const repo = store.getState().projectRepository;
					const getSpy = jest
						.spyOn(repo, "get")
						.mockResolvedValueOnce(null)
						.mockResolvedValue(reRead);
					const saveSpy = jest
						.spyOn(repo, "save")
						.mockResolvedValue({ ok: true } as never);
					const draft = new Project("p1", "Projet modifié", "");
					saveDraft("p1", draft.name, JSON.stringify(draft));
					return { store, getSpy, saveSpy };
				};

				it("relit le projet enregistré avant d'enregistrer, puis enregistre sans modale", async () => {
					const older = new Project("p1", "Projet", "");
					older.lastModificationDate = new Date(0);
					const { store, getSpy, saveSpy } = setup(older);
					await lifecycle(store).openProject("p1", true);
					expect(getSpy).toHaveBeenCalledTimes(1);

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(true);
					expect(getSpy.mock.calls.length).toBeGreaterThan(1);
					expect(saveSpy).toHaveBeenCalledTimes(1);
					expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
				});

				it("ouvre la modale de conflit sans enregistrer quand le projet relu est plus récent que le brouillon", async () => {
					const newer = new Project("p1", "Projet", "");
					newer.lastModificationDate = new Date(Date.now() + 60_000);
					const { store, saveSpy } = setup(newer);
					await lifecycle(store).openProject("p1", true);

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(false);
					expect(saveSpy).not.toHaveBeenCalled();
					expect(store.getState().ui.cloudConflictModalVisible).toBe(true);
					expect(store.getState().savingProject).toBe(false);
				});

				it("enregistre quand le projet reste injoignable à la relecture", async () => {
					const { store, saveSpy } = setup(null);
					await lifecycle(store).openProject("p1", true);

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(true);
					expect(saveSpy).toHaveBeenCalledTimes(1);
				});

				it("ne relit plus après un enregistrement réussi", async () => {
					const { store, getSpy, saveSpy } = setup(null);
					await lifecycle(store).openProject("p1", true);
					await lifecycle(store).saveProject();
					const newer = new Project("p1", "Projet", "");
					newer.lastModificationDate = new Date(Date.now() + 60_000);
					getSpy.mockResolvedValue(newer);

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(true);
					expect(saveSpy).toHaveBeenCalledTimes(2);
					expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
				});

				it("est réinitialisé à l'ouverture d'un autre projet", async () => {
					const { store, getSpy, saveSpy } = setup(null);
					await lifecycle(store).openProject("p1", true);
					await openBlankProject(store);
					const newer = new Project("p1", "Projet", "");
					newer.lastModificationDate = new Date(Date.now() + 60_000);
					getSpy.mockResolvedValue(newer);
					getSpy.mockClear();

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(true);
					expect(saveSpy).toHaveBeenCalledTimes(1);
					expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
				});

				it("n'est pas posé après une ouverture délibérée", async () => {
					const store = createProjectStore(createAppProjectStoreEnvironment());
					const repo = store.getState().projectRepository;
					const project = new Project("p1", "Projet", "");
					project.lastModificationDate = new Date(0);
					await repo.save(project);
					await lifecycle(store).openProject("p1");
					const newer = new Project("p1", "Projet", "");
					newer.lastModificationDate = new Date(Date.now() + 60_000);
					jest.spyOn(repo, "get").mockResolvedValue(newer);
					jest.spyOn(repo, "save").mockResolvedValue({ ok: true } as never);

					const saved = await lifecycle(store).saveProject();

					expect(saved).toBe(true);
					expect(store.getState().ui.cloudConflictModalVisible).toBe(false);
				});
			});

			it("ouvre le brouillon migré quand il a été enregistré dans une version plus ancienne", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "");
				project.lastModificationDate = new Date(0);
				await store.getState().projectRepository.save(project);
				const draft = new Project("p1", "Projet modifié", "");
				saveDraft(
					"p1",
					draft.name,
					JSON.stringify({
						...JSON.parse(JSON.stringify(draft)),
						schemaVersion: PROJECT_SCHEMA_VERSION - 1,
					}),
				);

				await lifecycle(store).openProject("p1", true);

				expect(store.getState().project?.name).toBe("Projet modifié");
				expect(store.getState().project?.schemaVersion).toBe(
					PROJECT_SCHEMA_VERSION,
				);
				expect(store.getState().hasUnsavedChanges).toBe(true);
			});

			it("se rabat sur le projet enregistré quand le brouillon vient d'une version plus récente", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "");
				await store.getState().projectRepository.save(project);
				saveDraft(
					"p1",
					"Projet",
					JSON.stringify({
						...JSON.parse(JSON.stringify(project)),
						name: "Futur",
						schemaVersion: PROJECT_SCHEMA_VERSION + 1,
					}),
				);

				await lifecycle(store).openProject("p1", true);

				expect(store.getState().project?.name).toBe("Projet");
				expect(getDraft("p1")).toBeNull();
			});

			it("se rabat sur le projet enregistré quand le brouillon est illisible", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "");
				await store.getState().projectRepository.save(project);
				saveDraft("p1", "Projet", "{ invalide");

				const result = await lifecycle(store).openProject("p1", true);

				expect(result).toBe(true);
				expect(store.getState().project?.name).toBe("Projet");
				expect(store.getState().hasUnsavedChanges).toBe(false);
				expect(getDraft("p1")).toBeNull();
			});
		});

		describe("restauration des onglets ouverts", () => {
			it("sans session ni URL, garde la page de démarrage par défaut", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "Author");
				await store.getState().projectRepository.save(project);

				await lifecycle(store).openProject("p1");

				expect(store.getState().pagesOrder).toEqual([PROJECT_STARTUP_PAGE_ID]);
				expect(store.getState().activePageId).toBe(PROJECT_STARTUP_PAGE_ID);
			});

			it("rouvre les onglets et la page active mémorisés en session (localStorage)", async () => {
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "Author");
				const grafcet = new Grafcet("g1", "Mon grafcet");
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
				const store = createProjectStore(createAppProjectStoreEnvironment());
				const project = new Project("p1", "Projet", "Author");
				const grafcetA = new Grafcet("gA", "A");
				const grafcetB = new Grafcet("gB", "B");
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
				const store = createProjectStore(createAppProjectStoreEnvironment());
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

	describe("openProjectByShareToken", () => {
		it("passe par le repository partagé du store, pas par une instance jetable", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const shared = new Project("shared-id", "Projet partagé", "Author");
			const getByShareToken = jest.fn().mockResolvedValue(shared);
			// Repository partageable minimal substitué au hybrid : si `openProjectByShareToken`
			// créait sa propre instance, ce spy ne serait jamais appelé.
			store.setState({
				projectRepository: {
					list: async () => ({ projects: [], skipped: [] }),
					get: async () => null,
					save: async () => ({ ok: true }),
					delete: async () => ({ ok: true }),
					getByShareToken,
					getShareToken: async () => null,
					createShareToken: async () => ({ ok: false, message: "" }),
					deleteShareToken: async () => ({ ok: true }),
				} as never,
			});

			const opened = await lifecycle(store).openProjectByShareToken("tok-1");

			expect(opened).toBe(true);
			expect(getByShareToken).toHaveBeenCalledWith("tok-1");
			expect(store.getState().project?.id).toBe("shared-id");
			expect(store.getState().isSharedProject).toBe(true);
		});

		it("laisse le token et aucun projectId dans l'URL pour survivre à un rechargement", async () => {
			window.history.replaceState(null, "", "/?shareToken=tok-1");
			const store = createProjectStore(createAppProjectStoreEnvironment());
			store.setState({
				projectRepository: {
					list: async () => ({ projects: [], skipped: [] }),
					get: async () => null,
					save: async () => ({ ok: true }),
					delete: async () => ({ ok: true }),
					getByShareToken: async () =>
						new Project("shared-id", "Projet partagé", "Author"),
					getShareToken: async () => null,
					createShareToken: async () => ({ ok: false, message: "" }),
					deleteShareToken: async () => ({ ok: true }),
				} as never,
			});

			await lifecycle(store).openProjectByShareToken("tok-1");

			expect(getShareTokenFromUrl()).toBe("tok-1");
			expect(getProjectIdFromUrl()).toBeNull();
		});

		it("retourne false si le repository n'est pas partageable", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			store.setState({
				projectRepository: {
					list: async () => ({ projects: [], skipped: [] }),
					get: async () => null,
					save: async () => ({ ok: true }),
					delete: async () => ({ ok: true }),
				} as never,
			});

			expect(await lifecycle(store).openProjectByShareToken("tok-1")).toBe(
				false,
			);
			expect(toast.error).toHaveBeenCalledTimes(1);
		});

		it("signale l'échec par un toast quand le projet partagé est introuvable ou injoignable", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			store.setState({
				projectRepository: {
					list: async () => ({ projects: [], skipped: [] }),
					get: async () => null,
					save: async () => ({ ok: true }),
					delete: async () => ({ ok: true }),
					getByShareToken: async () => null,
					getShareToken: async () => null,
					createShareToken: async () => ({ ok: false, message: "" }),
					deleteShareToken: async () => ({ ok: true }),
				} as never,
			});
			(toast.error as jest.Mock).mockClear();

			expect(await lifecycle(store).openProjectByShareToken("tok-1")).toBe(
				false,
			);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(store.getState().project).toBeNull();
		});
	});

	describe("resolveDraftConflict", () => {
		it("ne fait rien si la modale n'est pas active", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			await openBlankProject(store);
			await expect(
				lifecycle(store).resolveDraftConflict("draft"),
			).resolves.not.toThrow();
		});

		it("supprime le brouillon, ferme la modale et ouvre le projet enregistré quand le choix est 'real'", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("p1", "Projet", "");
			await store.getState().projectRepository.save(project);
			store.setState({
				project: null,
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
			expect(store.getState().project?.id).toBe("p1");
			expect(store.getState().hasUnsavedChanges).toBe(false);
			expect(getDraft("p1")).toBeNull();
		});

		it("ouvre le brouillon et marque hasUnsavedChanges quand le choix est 'draft'", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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

		it("ouvre le brouillon migré quand le choix est 'draft' et que la version est ancienne", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const project = new Project("p1", "Projet", "");
			const draftData = JSON.stringify({
				...JSON.parse(JSON.stringify(project)),
				schemaVersion: PROJECT_SCHEMA_VERSION - 1,
			});
			store.setState({
				ui: {
					...store.getState().ui,
					draftConflictModal: { visible: true, projectId: "p1", draftData },
				},
			});

			await lifecycle(store).resolveDraftConflict("draft");

			expect(store.getState().project?.schemaVersion).toBe(
				PROJECT_SCHEMA_VERSION,
			);
			expect(store.getState().hasUnsavedChanges).toBe(true);
		});

		it("affiche un toast et ferme la modale si le brouillon est corrompu", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
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
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const projectId = await openProjectWithDraft(store);

			await lifecycle(store).newProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();

			expect(getDraft(projectId)).toBeNull();
		});

		it("supprime le brouillon quand on continue depuis closeProject", async () => {
			const store = createProjectStore(createAppProjectStoreEnvironment());
			const projectId = await openProjectWithDraft(store);

			await lifecycle(store).closeProject();
			store.getState().ui.onUnsavedChangesDialogContinue?.();
			await Promise.resolve();

			expect(getDraft(projectId)).toBeNull();
		});
	});
});
