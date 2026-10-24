import Project, {
	DEFAULT_PROJECT_NAME,
} from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import type { Locale } from "@/i18n/config";
import { PROJECT_TEMPLATES } from "@/templates/index";
import localizeProject from "@/templates/localize-project";
import { getTemplateStatement } from "@/templates/template-text";
import {
	isShareable,
	SaveFailureReason,
} from "@/persistence/repositories/project.repository";
import { toast } from "react-toastify";
import {
	Draft,
	deleteDraft,
	getDraft,
	parseDraftProject,
	saveDraft,
} from "@/persistence/draft.storage";
import type { PagesSession } from "@/persistence/pages-session.storage";
import type { ProjectStoreEnvironment } from "../environment/project-store-environment";
import { getT } from "@/ui/i18n/translateGlobal";
import {
	getInitialPagesData,
	restorePagesSession,
} from "../pages-session-restore";
import resolveSaveLocationIfNeeded from "../save-location";
import {
	PageData,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store.types";

const SAVE_FAILURE_KEYS: Record<SaveFailureReason, string> = {
	"quota-exceeded": "storageFull",
	unavailable: "storageUnavailable",
	network: "cloudUnreachable",
	conflict: "conflict",
	unknown: "generic",
};

function saveFailureMessage(reason: SaveFailureReason): string {
	return getT("toasts.save")(SAVE_FAILURE_KEYS[reason] as never);
}

const AUTO_SAVE_INTERVAL_MS = 30_000;

/**
 * Ouverture, création (vierge ou depuis un template), enregistrement, fermeture d'un projet, et
 * cycle de l'auto-sauvegarde du brouillon. Toutes ces actions sont déclenchées ponctuellement
 * (menu, modale, raccourci) — elles vivent hors de l'objet d'état du store pour qu'aucun
 * composant n'ait à s'y abonner.
 */
export default class ProjectLifecycleManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;
	private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
	// Draft opened while the stored project was unreachable: the repository only knows the
	// cloud version after a successful read, so the next save must read it first.
	private unprimedDraft: { projectId: string; draftSavedAt: number } | null =
		null;

	constructor(
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
		private readonly env: ProjectStoreEnvironment,
	) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	private applyOpenedProject(
		project: Project,
		initialPagesData: Record<string, PageData>,
	): void {
		const set = this.setStoreState;
		const get = this.getStoreState;
		this.unprimedDraft = null;
		//The undo histories belong to the project being left
		get().grafcetsManager.clearCommandsStacks();
		get().laddersManager.clearCommandsStacks();
		get().hmiManager.clearCommandsStacks();
		void get().hardwareLinkManager.unlink();
		get().scene3dLinkManager.close();
		//Le presse-papiers aussi : ses éléments référencent des variables par id, sans validité
		//dans un autre projet.
		get().clipboard.getState().clear();
		const pagesOrder = Object.keys(initialPagesData);
		set(() => ({
			project: project,
			bootStatus: "idle",
			hasUnsavedChanges: false,
			autoSaveUnavailable: false,
			pagesData: initialPagesData,
			pagesOrder,
			activePageId: pagesOrder[0] ?? null,
			activeScope: "project",
			activeScopeType: "project",
		}));
	}

	/**
	 * Opens `project` as given, with `pages` as the only open tabs (the first one active, unless
	 * `activePageId` designates another of them). Touches neither the URL, the storage nor the
	 * repository, so it works on a store without persistence.
	 */
	openProjectInstance(
		project: Project,
		pages: PageData[],
		activePageId?: string,
	): void {
		const pagesData: Record<string, PageData> = {};
		for (const page of pages) pagesData[page.id] = page;
		this.applyOpenedProject(project, pagesData);
		const active = pages.find((page) => page.id === activePageId) ?? pages[0];
		if (!active) return;
		this.setStoreState(() => ({ activePageId: active.id }));
		this.getStoreState().setActiveScope(active.id);
	}

	private async doOpenProject(project: Project): Promise<void> {
		this.applyOpenedProject(project, getInitialPagesData());
		//Pour qu'un rechargement de la page rouvre le même projet, voir ProjectContextProvider
		this.env.persistence?.url.setProjectId(project.id);
		this.env.persistence?.url.clearShareToken();
		//Repart de zéro : un `activePage` d'URL laissé par un projet précédent n'a aucun sens ici.
		//`openProject` l'a lu avant cet appel s'il doit le restaurer, voir restorePagesSession.
		this.env.persistence?.url.setActivePageId(null);
	}

	private async doNewProject(
		templateId: string | null = null,
		variant: "exercise" | "solution" = "exercise",
		locale: Locale = this.env.getLocale(),
	): Promise<void> {
		let project: Project;
		if (templateId !== null) {
			const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
			if (template) {
				project =
					variant === "solution" && template.solution
						? template.solution(locale)
						: template.create(locale);
				localizeProject(project, locale, {
					keep: template.keepMnemonics,
				});
				//L'énoncé accompagne les deux variantes : il donne son sens à la solution comme à
				//l'exercice, une même maquette pouvant servir de support à des énoncés différents.
				const statement = getTemplateStatement(templateId, locale);
				if (statement) {
					project.exercise = { statement };
				}
			} else {
				project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
			}
		} else {
			project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
		}
		this.env.analytics.trackEvent("project-created", {
			template: templateId ?? "blank",
			variant,
		});
		await this.doOpenProject(project);
	}

	// Abandon explicite des modifications en cours : le brouillon auto-sauvegardé du projet
	// courant ne doit pas ressusciter les changements rejetés à la prochaine ouverture.
	private discardCurrentDraft(): void {
		const project = this.getStoreState().project;
		if (project) deleteDraft(project.id);
	}

	private async doCloseProject(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		get().grafcetsManager.clearCommandsStacks();
		get().laddersManager.clearCommandsStacks();
		get().hmiManager.clearCommandsStacks();
		void get().hardwareLinkManager.unlink();
		get().scene3dLinkManager.close();
		set(() => ({
			project: null,
			hasUnsavedChanges: false,
			autoSaveUnavailable: false,
			isSharedProject: false,
			shareToken: null,
			pagesData: {},
			pagesOrder: [],
			activePageId: null,
			activeScope: "project",
			activeScopeType: "project",
		}));
		this.env.persistence?.url.setProjectId(null);
		this.env.persistence?.url.clearShareToken();
		this.env.persistence?.url.setActivePageId(null);
	}

	/**
	 * Ouvre `project` puis restaure la session de pages depuis l'URL. Chemin commun à
	 * l'ouverture délibérée et aux sorties des modales de conflit (brouillon, cloud).
	 */
	private async openAndRestore(
		project: Project,
		opts: { shared: boolean; unsaved: boolean },
	): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const urlActiveId = this.env.persistence?.url.getActivePageId() ?? null;
		await this.doOpenProject(project);
		set(() => ({
			isSharedProject: opts.shared,
			hasUnsavedChanges: opts.unsaved,
		}));
		if (this.env.persistence)
			restorePagesSession(
				set,
				get,
				project,
				urlActiveId,
				this.env.persistence.pagesSession,
			);
	}

	private openDraftConflictModal(projectId: string, draft: Draft): void {
		this.setStoreState((state) => ({
			bootStatus: "idle",
			ui: {
				...state.ui,
				draftConflictModal: {
					visible: true,
					projectId,
					draftData: draft.data,
				},
			},
		}));
	}

	/** Returns true if a project was opened, false if cancelled or failed. */
	async openProject(projectId: string, preferDraft = false): Promise<boolean> {
		const get = this.getStoreState;
		let project: Project | null = null;
		let fromDraft = false;
		let unprimedDraft: ProjectLifecycleManager["unprimedDraft"] = null;

		if (preferDraft) {
			// Rechargement via URL : le brouillon est prioritaire, mais on lit tout de même le
			// projet enregistré. Deux raisons : réamorcer la version de concurrence optimiste du
			// repository (sans quoi l'enregistrement suivant partirait en faux conflit), et
			// détecter qu'un autre appareil a écrit depuis la dernière sauvegarde du brouillon.
			const draft = getDraft(projectId);
			const draftProject = draft ? parseDraftProject(draft.data) : null;
			if (draft && !draftProject) {
				// Brouillon illisible : suppression et repli sur le projet réel
				deleteDraft(projectId);
			}
			const stored = await get().projectRepository.get(projectId);
			if (draft && draftProject) {
				if (stored && stored.lastModificationDate.getTime() > draft.savedAt) {
					// Le projet enregistré est plus récent que le brouillon : proposer le choix
					this.openDraftConflictModal(projectId, draft);
					return true;
				}
				project = draftProject;
				fromDraft = true;
				if (!stored) {
					unprimedDraft = { projectId, draftSavedAt: draft.savedAt };
				}
			} else {
				project = stored;
			}
		} else {
			// Ouverture délibérée : charger le projet réel, puis vérifier le brouillon
			project = await get().projectRepository.get(projectId);
			if (project) {
				const draft = getDraft(projectId);
				if (draft) {
					if (draft.savedAt > project.lastModificationDate.getTime()) {
						// Brouillon plus récent : proposer le choix via modale
						this.openDraftConflictModal(projectId, draft);
						return true;
					} else {
						// Brouillon périmé : suppression silencieuse
						deleteDraft(projectId);
					}
				}
			}
		}

		if (!project) return false;
		await this.openAndRestore(project, {
			shared: false,
			unsaved: fromDraft,
		});
		this.unprimedDraft = unprimedDraft;
		return true;
	}

	async openProjectByShareToken(token: string): Promise<boolean> {
		const set = this.setStoreState;
		// Passer par le repository partagé du store, jamais par un `new SupabaseProjectRepository()`
		// jetable : c'est cette instance-là qui retient la `version` cloud servant de `baseVersion`
		// à un enregistrement conditionnel ultérieur (voir `SupabaseProjectRepository`).
		const repo = this.getStoreState().projectRepository;
		const project = isShareable(repo)
			? await repo.getByShareToken(token)
			: null;
		if (!project) {
			toast.error(getT("toasts")("shareLinkOpenFailed"));
			return false;
		}
		await this.doOpenProject(project);
		this.env.analytics.trackEvent("shared-project-opened");
		set(() => ({ isSharedProject: true, shareToken: null }));
		//Un projet partagé n'a pas de brouillon ni d'entrée dans l'index local : seul le token
		//permet de le rouvrir après un rechargement.
		this.env.persistence?.url.setProjectId(null);
		this.env.persistence?.url.setShareToken(token);
		return true;
	}

	async newProject(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const openModal = () =>
			set((state) => ({ ui: { ...state.ui, newProjectModalVisible: true } }));
		if (!get().hasUnsavedChanges) {
			openModal();
			return;
		}
		set((state) => ({
			ui: {
				...state.ui,
				unsavedChangesDialogVisible: true,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: () => {
					this.discardCurrentDraft();
					openModal();
				},
			},
		}));
	}

	async newProjectFromTemplate(
		templateId: string | null,
		variant: "exercise" | "solution" = "exercise",
		locale?: Locale,
	): Promise<void> {
		this.setStoreState((state) => ({
			ui: { ...state.ui, newProjectModalVisible: false },
		}));
		await this.doNewProject(templateId, variant, locale);
	}

	/**
	 * Opens a project built outside the application (a page of the site) as a new project, with
	 * the statement of the template it comes from and the tabs that were open on it.
	 */
	async newProjectFromHandoff(
		project: Project,
		templateId: string | null,
		locale: Locale,
		pages: PagesSession,
	): Promise<void> {
		const statement = templateId
			? getTemplateStatement(templateId, locale)
			: null;
		if (statement) project.exercise = { statement };
		this.env.analytics.trackEvent("project-created", {
			template: templateId ?? "blank",
			variant: "handoff",
		});
		await this.doOpenProject(project);
		const persistence = this.env.persistence;
		if (!persistence) return;
		persistence.pagesSession.set(project.id, pages);
		restorePagesSession(
			this.setStoreState,
			this.getStoreState,
			project,
			null,
			persistence.pagesSession,
		);
	}

	/** true si réellement enregistré. */
	async saveProject(): Promise<boolean> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return false;
		// Projet ouvert en lecture seule via un lien de partage : Enregistrer = Enregistrer sous
		if (get().isSharedProject) {
			set((state) => ({ ui: { ...state.ui, saveAsModalVisible: true } }));
			return false;
		}
		set(() => ({ savingProject: true }));
		if (this.unprimedDraft?.projectId === project.id) {
			const stored = await get().projectRepository.get(project.id);
			if (
				stored &&
				stored.lastModificationDate.getTime() > this.unprimedDraft.draftSavedAt
			) {
				set((state) => ({
					savingProject: false,
					ui: { ...state.ui, cloudConflictModalVisible: true },
				}));
				return false;
			}
			if (stored) this.unprimedDraft = null;
		}
		const location = await resolveSaveLocationIfNeeded(
			project,
			get,
			set,
			this.env,
		);
		if (location === "cancelled") {
			set(() => ({ savingProject: false }));
			return false;
		}

		const newProject = project.copy();
		newProject.touch(); //Update the project's last modified date

		const result = await get().projectRepository.save(newProject, location);
		if (!result.ok) {
			//Ne jamais annoncer un enregistrement qui n'a pas eu lieu : le projet reste
			//marqué comme modifié pour que l'utilisateur puisse réessayer
			set(() => ({ savingProject: false }));
			if (result.reason === "conflict") {
				set((state) => ({
					ui: { ...state.ui, cloudConflictModalVisible: true },
				}));
				return false;
			}
			toast.error(saveFailureMessage(result.reason));
			console.error("Failed to save the project:", result.cause);
			return false;
		}

		// Edits made during the await replace `project` with a new object: they live only in
		// the store and the draft, so both must survive.
		if (get().project !== project) {
			set(() => ({ autoSaveUnavailable: false, savingProject: false }));
			return true;
		}

		set(() => ({
			project: newProject,
			hasUnsavedChanges: false,
			autoSaveUnavailable: false,
			savingProject: false,
		}));
		deleteDraft(newProject.id);
		this.unprimedDraft = null;
		return true;
	}

	/** Copie avec un nouvel id et le nom donné. */
	async saveProjectAs(name: string): Promise<boolean> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return false;
		const copy = project.copy();
		copy.id = createRandomId();
		copy.name = name.trim() || project.name;
		copy.touch();

		set(() => ({ savingProject: true }));
		const location = await resolveSaveLocationIfNeeded(
			copy,
			get,
			set,
			this.env,
		);
		if (location === "cancelled") {
			set(() => ({ savingProject: false }));
			return false;
		}

		const result = await get().projectRepository.save(copy, location);
		if (!result.ok) {
			set(() => ({ savingProject: false }));
			toast.error(saveFailureMessage(result.reason));
			console.error("Failed to save the project:", result.cause);
			return false;
		}
		await this.doOpenProject(copy);
		set(() => ({ hasUnsavedChanges: false, savingProject: false }));
		// Le brouillon de l'original n'est pas supprimé : seul un enregistrement explicite
		// sur ce projet l'effacera. La copie démarre sans brouillon.
		return true;
	}

	async closeProject(): Promise<void> {
		const get = this.getStoreState;
		if (!get().hasUnsavedChanges) {
			await this.doCloseProject();
			return;
		}
		this.setStoreState((state) => ({
			ui: {
				...state.ui,
				unsavedChangesDialogVisible: true,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: () => {
					this.discardCurrentDraft();
					void this.doCloseProject();
				},
			},
		}));
	}

	async resolveDraftConflict(choice: "draft" | "real"): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const { projectId, draftData } = get().ui.draftConflictModal;
		if (!projectId) return;
		set((state) => ({
			ui: {
				...state.ui,
				draftConflictModal: {
					visible: false,
					projectId: null,
					draftData: null,
				},
			},
		}));
		if (choice === "draft" && draftData) {
			try {
				const project = parseDraftProject(draftData);
				if (!project) throw new Error("Unreadable draft");
				await this.openAndRestore(project, {
					shared: false,
					unsaved: true,
				});
			} catch {
				toast.error(getT("toasts")("draftCorrupted"));
			}
		} else {
			// Partir du projet réel : supprimer le brouillon puis (re)charger et ouvrir
			// le projet enregistré (l'ouverture délibérée s'est arrêtée à la modale)
			deleteDraft(projectId);
			const project = await get().projectRepository.get(projectId);
			if (!project) {
				toast.error(getT("toasts")("projectReloadFailed"));
				return;
			}
			await this.openAndRestore(project, {
				shared: false,
				unsaved: false,
			});
		}
	}

	/**
	 * `"reload"` abandonne les modifications locales pour reprendre la version enregistrée par
	 * l'autre appareil. `"copy"` renvoie vers "Enregistrer sous" : le travail local n'est pas
	 * perdu, mais reste à fusionner manuellement avec la version en ligne.
	 */
	async resolveCloudConflict(choice: "reload" | "copy"): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		set((state) => ({
			ui: { ...state.ui, cloudConflictModalVisible: false },
		}));
		if (choice === "copy") {
			set((state) => ({ ui: { ...state.ui, saveAsModalVisible: true } }));
			return;
		}
		const project = get().project;
		if (!project) return;
		const reloaded = await get().projectRepository.get(project.id);
		if (!reloaded) {
			toast.error(getT("toasts")("cloudReloadFailed"));
			return;
		}
		deleteDraft(project.id);
		await this.openAndRestore(reloaded, { shared: false, unsaved: false });
	}

	/** Writes the unsaved changes of the open project to its local draft. */
	/**
	 * Writes the draft of pending changes. Returns whether a reload would lose nothing: `false`
	 * when the write failed, or for a shared project, which has no draft.
	 */
	flushDraft(): boolean {
		const { project, hasUnsavedChanges, isSharedProject } =
			this.getStoreState();
		if (!project || !hasUnsavedChanges) return true;
		if (isSharedProject) return false;
		const result = saveDraft(project.id, project.name, JSON.stringify(project));
		this.setStoreState(() => ({ autoSaveUnavailable: !result.ok }));
		if (!result.ok) {
			console.error("Auto-save of the draft failed:", result.reason);
		}
		return result.ok;
	}

	startAutoSave(): void {
		if (this.autoSaveTimer !== null) return;
		this.autoSaveTimer = setInterval(
			() => this.flushDraft(),
			AUTO_SAVE_INTERVAL_MS,
		);
	}

	stopAutoSave(): void {
		if (this.autoSaveTimer === null) return;
		clearInterval(this.autoSaveTimer);
		this.autoSaveTimer = null;
	}
}
