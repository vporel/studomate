import Project, {
	DEFAULT_PROJECT_NAME,
} from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { PROJECT_TEMPLATES } from "@/templates/index";
import {
	SaveFailureReason,
	StorageLocation,
} from "@/persistence/repositories/project.repository";
import { toast } from "react-toastify";
import {
	getActivePageIdFromUrl,
	setActivePageIdInUrl,
} from "@/ui/lib/pages-url";
import {
	clearShareTokenFromUrl,
	setProjectIdInUrl,
} from "@/ui/lib/project-url";
import SupabaseProjectRepository from "@/persistence/repositories/supabase.project.repository";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import { deleteDraft, getDraft, saveDraft } from "@/persistence/draft.storage";
import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import { authStore } from "@/ui/stores/auth/auth.store";
import { clearClipboard } from "@/ui/stores/shared/clipboard.store";
import trackEvent from "@/ui/lib/analytics";
import { getT } from "@/ui/i18n/translateGlobal";
import {
	getInitialPagesData,
	restorePagesSession,
} from "../pages-session-restore";
import {
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

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	private async doOpenProject(project: Project): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		//The undo histories belong to the project being left
		get().grafcetsManager.clearCommandsStacks();
		get().laddersManager.clearCommandsStacks();
		get().hmiManager.clearCommandsStacks();
		//Le presse-papiers aussi : ses éléments référencent des variables par id, sans validité
		//dans un autre projet.
		clearClipboard();
		const initialPagesData = getInitialPagesData();
		set(() => ({
			project: project,
			bootStatus: "idle",
			hasUnsavedChanges: false,
			pagesData: initialPagesData,
			pagesOrder: Object.keys(initialPagesData),
			activePageId: Object.keys(initialPagesData)[0],
			activeScope: "project",
			activeScopeType: "project",
		}));
		//Pour qu'un rechargement de la page rouvre le même projet, voir ProjectContextProvider
		setProjectIdInUrl(project.id);
		//Repart de zéro : un `activePage` d'URL laissé par un projet précédent n'a aucun sens ici.
		//`openProject` l'a lu avant cet appel s'il doit le restaurer, voir restorePagesSession.
		setActivePageIdInUrl(null);
	}

	private async doNewProject(
		templateId: string | null = null,
		variant: "exercise" | "solution" = "exercise",
	): Promise<void> {
		let project: Project;
		if (templateId !== null) {
			const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
			if (template) {
				project =
					variant === "solution" && template.solution
						? template.solution()
						: template.create();
				//L'énoncé accompagne les deux variantes : il donne son sens à la solution comme à
				//l'exercice, une même maquette pouvant servir de support à des énoncés différents.
				if (template.statement) {
					project.exercise = { statement: template.statement };
				}
			} else {
				project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
			}
		} else {
			project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
		}
		trackEvent("project-created", { template: templateId ?? "blank", variant });
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
		set(() => ({
			project: null,
			hasUnsavedChanges: false,
			isSharedProject: false,
			shareToken: null,
			pagesData: {},
			pagesOrder: [],
			activePageId: null,
			activeScope: "project",
			activeScopeType: "project",
		}));
		setProjectIdInUrl(null);
		setActivePageIdInUrl(null);
	}

	/** Returns true if a project was opened, false if cancelled or failed. */
	async openProject(projectId: string, preferDraft = false): Promise<boolean> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		let project: Project | null = null;
		let fromDraft = false;

		if (preferDraft) {
			// Rechargement via URL : brouillon prioritaire, pas de modale
			const draft = getDraft(projectId);
			if (draft) {
				try {
					project = Project.createFromJSON(draft.data);
					fromDraft = true;
				} catch {
					// Brouillon illisible : suppression et repli sur le projet réel
					deleteDraft(projectId);
				}
			}
			if (!project) project = await get().projectRepository.get(projectId);
		} else {
			// Ouverture délibérée : charger le projet réel, puis vérifier le brouillon
			project = await get().projectRepository.get(projectId);
			if (project) {
				const draft = getDraft(projectId);
				if (draft) {
					if (draft.savedAt > project.lastModificationDate.getTime()) {
						// Brouillon plus récent : proposer le choix via modale
						set((state) => ({
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
						return true;
					} else {
						// Brouillon périmé : suppression silencieuse
						deleteDraft(projectId);
					}
				}
			}
		}

		if (!project) return false;
		const urlActiveId = getActivePageIdFromUrl();
		await this.doOpenProject(project);
		set(() => ({ isSharedProject: false, hasUnsavedChanges: fromDraft }));
		restorePagesSession(set, get, project, urlActiveId);
		return true;
	}

	async openProjectByShareToken(token: string): Promise<boolean> {
		const set = this.setStoreState;
		const supabase = new SupabaseProjectRepository();
		const project = await supabase.getByShareToken(token);
		if (!project) return false;
		await this.doOpenProject(project);
		set(() => ({ isSharedProject: true, shareToken: null }));
		clearShareTokenFromUrl();
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
	): Promise<void> {
		this.setStoreState((state) => ({
			ui: { ...state.ui, newProjectModalVisible: false },
		}));
		await this.doNewProject(templateId, variant);
	}

	/**
	 * Résout le lieu de stockage à passer à `save` pour `project` — `undefined` si ce projet a
	 * déjà un lieu (rien à décider, `save` garde son comportement par défaut).
	 *
	 * Un id absent de l'index cloud n'est pas forcément neuf (il peut déjà exister en local) :
	 * seul un id absent des deux repositories l'est réellement, d'où la lecture locale avant de
	 * proposer un choix.
	 */
	private async resolveLocationIfNeeded(
		project: Project,
	): Promise<StorageLocation | undefined | "cancelled"> {
		const repo = this.getStoreState().projectRepository;
		if (!(repo instanceof HybridProjectRepository)) return undefined;
		if (repo.locationOf(project.id) === "cloud") return undefined;
		if ((await repo.get(project.id)) !== null) return undefined;

		const preferred = getPreferredSaveLocation();
		if (preferred === "cloud" && authStore.getState().user) return "cloud";
		if (preferred === "local") return "local";

		// Pas encore de préférence, ou préférence "cloud" sans session active : on demande —
		// dans le second cas, un nouveau choix "cloud" plutôt qu'un aller direct vers la
		// connexion, l'utilisateur pouvant préférer rester en local pour cette fois.
		const persistAsDefault = preferred === null;
		const resolved = await this.openSaveLocationModal();
		if (resolved && persistAsDefault) setPreferredSaveLocation(resolved);
		return resolved ?? "cancelled";
	}

	private openSaveLocationModal(): Promise<StorageLocation | null> {
		return new Promise((resolve) => {
			this.setStoreState((state) => ({
				ui: {
					...state.ui,
					saveLocationModalVisible: true,
					onSaveLocationChosen: (location) => {
						this.setStoreState((state) => ({
							ui: {
								...state.ui,
								saveLocationModalVisible: false,
								onSaveLocationChosen: null,
							},
						}));
						resolve(location);
					},
				},
			}));
		});
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
		const location = await this.resolveLocationIfNeeded(project);
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

		set(() => ({
			project: newProject,
			hasUnsavedChanges: false,
			savingProject: false,
		}));
		deleteDraft(newProject.id);
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
		const location = await this.resolveLocationIfNeeded(copy);
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
				const project = Project.createFromJSON(draftData);
				const urlActiveId = getActivePageIdFromUrl();
				await this.doOpenProject(project);
				set(() => ({ isSharedProject: false, hasUnsavedChanges: true }));
				restorePagesSession(set, get, project, urlActiveId);
			} catch {
				toast.error(getT("toasts")("draftCorrupted"));
			}
		} else {
			// Partir du projet réel : supprimer le brouillon
			deleteDraft(projectId);
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
		const urlActiveId = getActivePageIdFromUrl();
		deleteDraft(project.id);
		await this.doOpenProject(reloaded);
		set(() => ({ isSharedProject: false, hasUnsavedChanges: false }));
		restorePagesSession(set, get, reloaded, urlActiveId);
	}

	startAutoSave(): void {
		if (this.autoSaveTimer !== null) return;
		this.autoSaveTimer = setInterval(() => {
			const { project, hasUnsavedChanges, isSharedProject } =
				this.getStoreState();
			if (!project || !hasUnsavedChanges || isSharedProject) return;
			saveDraft(project.id, project.name, JSON.stringify(project));
		}, AUTO_SAVE_INTERVAL_MS);
	}

	stopAutoSave(): void {
		if (this.autoSaveTimer === null) return;
		clearInterval(this.autoSaveTimer);
		this.autoSaveTimer = null;
	}
}
