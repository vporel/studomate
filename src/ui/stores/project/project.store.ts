import Project, {
	DEFAULT_PROJECT_NAME,
} from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { PROJECT_TEMPLATES } from "@/templates/index";
import {
	PROJECT_STARTUP_PAGE_DATA,
	PROJECT_STARTUP_PAGE_ID,
} from "@/ui/components/pages/ProjectStartupPage";
import {
	PROJECT_PROPERTIES_PAGE_DATA,
	PROJECT_PROPERTIES_PAGE_ID,
} from "@/ui/components/pages/ProjectPropertiesPage";
import {
	getVariablesPageData,
	VariablesPageId,
} from "@/ui/components/pages/VariablesPage";
import { Dialect } from "@/expression-language/dialect.enum";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import ProjectRepository, {
	SaveFailureReason,
	isShareable,
} from "@/persistence/repositories/project.repository";
import SupabaseProjectRepository from "@/persistence/repositories/supabase.project.repository";
import { authStore } from "@/ui/stores/auth/auth.store";
import { toast } from "react-toastify";
import { createStore } from "zustand";
import { GrafcetStoreState } from "../grafcet/grafcet.store";
import { HmiStoreState } from "../hmi/hmi.store";
import { LadderStoreState } from "../ladder/ladder.store";
import ProjectCommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import LaddersManager from "./managers/ladders.manager";
import PagesManager from "./managers/pages.manager";
import HmiManager from "./managers/hmi.manager";
import {
	AnalysisIssues,
	emptyAnalysisIssues,
} from "@/bridge/analysis-issues.mapper";
import SimulationManager from "./managers/simulation/simulation.manager";
import ToastSimulationNotifier from "./managers/simulation/toast.simulation.notifier";
import VariablesManager from "./managers/variables.manager";
import { ProjectMode } from "./ProjectMode.enum";
import { SimulationMode } from "./SimulationMode.enum";
import {
	setProjectIdInUrl,
	clearShareTokenFromUrl,
} from "@/ui/lib/project-url";
import {
	getActivePageIdFromUrl,
	setActivePageIdInUrl,
} from "@/ui/lib/pages-url";
import { getPagesSession } from "@/ui/lib/pages-session-storage";
import { performRedo, performUndo } from "./undo-redo";
import { clearClipboard } from "@/ui/stores/shared/clipboard.store";
import { deleteDraft, getDraft, saveDraft } from "@/persistence/draft.storage";

type SimpleCallback = () => void;

const SAVE_FAILURE_MESSAGES: Record<SaveFailureReason, string> = {
	"quota-exceeded":
		"Enregistrement impossible : l'espace de stockage du navigateur est plein. Exportez le projet dans un fichier pour ne pas perdre votre travail.",
	unavailable:
		"Enregistrement impossible : le stockage du navigateur est inaccessible (navigation privée ?). Exportez le projet dans un fichier.",
	network:
		"Enregistrement dans le cloud impossible : vérifiez votre connexion et que vous êtes bien connecté. Exportez le projet dans un fichier pour ne pas perdre votre travail.",
	unknown:
		"Enregistrement impossible. Exportez le projet dans un fichier pour ne pas perdre votre travail.",
};

export type PageType =
	| "project-startup"
	| "project-properties"
	| "grafcet"
	| "ladder"
	| "variables"
	| "hmi"
	| "hmi-simulation";

/**
 * The variables are managed in the project scope
 */
export type ScopeType = "project" | "grafcet" | "ladder" | "hmi";

export type PageData = {
	id: string;
	type: PageType;
	title: string;
};

export type GrafcetStoreValues = Pick<
	GrafcetStoreState,
	"hasCommandsToUndo" | "hasCommandsToRedo"
>;

export type GrafcetStoreManagers = Pick<
	GrafcetStoreState,
	| "viewManager"
	| "copyCutPasteManager"
	| "commandsStackManager"
	| "workflowManager"
>;

export type LadderStoreValues = Pick<
	LadderStoreState,
	"hasCommandsToUndo" | "hasCommandsToRedo"
>;

export type LadderStoreManagers = Pick<
	LadderStoreState,
	| "commandsStackManager"
	| "viewManager"
	| "copyCutPasteManager"
	| "workflowManager"
>;

export type HmiStoreValues = Pick<
	HmiStoreState,
	"hasCommandsToUndo" | "hasCommandsToRedo"
>;

export type HmiStoreManagers = Pick<
	HmiStoreState,
	| "commandsStackManager"
	| "copyCutPasteManager"
	| "selectAllWidgets"
	| "removeSelectedWidgets"
>;

export type PLCConfig = {
	scanTimeMs: number;
};

export type SimulationVariableState = {
	id: string;
	mnemonic: string;
	value: any;
};

/**
 * Pure UI state: nothing here has business meaning on its own, it only reflects what's
 * currently shown on screen (dialogs, panels). Kept as one nested object rather than split
 * into its own store: the managers below already read/write it in the same `set()` calls as
 * business fields (e.g. `SimulationManager` opens the watch tables and switches to simulation
 * mode together), so a separate store would just move the mixing elsewhere.
 */
export interface ProjectUiState {
	unsavedChangesDialogVisible: boolean;
	unsavedChangesDialogMessage: string | null;
	onUnsavedChangesDialogCancel: SimpleCallback | null;
	onUnsavedChangesDialogContinue: SimpleCallback | null;
	openModalVisible: boolean;
	newProjectModalVisible: boolean;
	exportModalVisible: boolean;
	pdfExportModalVisible: boolean;
	saveAsModalVisible: boolean;
	shareModalVisible: boolean;
	shareRequiresCloudModalVisible: boolean;
	analysisResultVisible: boolean;
	watchTablesVisible: boolean;
	draftConflictModal: {
		visible: boolean;
		projectId: string | null;
		draftData: string | null;
	};
}

export interface ProjectStoreState {
	//Project
	project: Project | null; //null when no project is opened
	hasUnsavedChanges: boolean;
	ui: ProjectUiState;
	savingProject: boolean;
	/**
	 * Accès au stockage. Dans le store pour rester substituable : la sauvegarde cloud de la
	 * feuille de route viendra remplacer l'implémentation sans toucher au reste.
	 */
	projectRepository: ProjectRepository;
	activeScope: string; //The currently active scope (used for keyboard shortcuts). The scope can be defined by an objectId (for example, the grafcetId of the currently active grafcet)
	activeScopeType: ScopeType;
	variablesManager: VariablesManager;

	getProject: () => Project | null;
	openProject: (projectId: string, preferDraft?: boolean) => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	openProjectByShareToken: (token: string) => Promise<boolean>;
	newProject: () => Promise<void>;
	newProjectFromTemplate: (
		templateId: string | null,
		variant?: "exercise" | "solution",
	) => Promise<void>;
	saveProject: () => Promise<boolean>; // true si réellement enregistré
	saveProjectAs: (name: string) => Promise<boolean>; // copie avec un nouvel id et le nom donné
	closeProject: () => Promise<void>;

	startAutoSave: () => void;
	stopAutoSave: () => void;

	setProjectName: (newName: string) => void;
	setProjectAuthor: (newAuthor: string) => void;
	setProjectDialect: (dialect: Dialect) => void;

	setUnsavedChangesDialogVisible: (visible: boolean) => void;
	setOpenModalVisible: (visible: boolean) => void;
	setNewProjectModalVisible: (visible: boolean) => void;
	setExportModalVisible: (visible: boolean) => void;
	setPdfExportModalVisible: (visible: boolean) => void;
	setSaveAsModalVisible: (visible: boolean) => void;
	setShareModalVisible: (visible: boolean) => void;
	setShareRequiresCloudModalVisible: (visible: boolean) => void;
	setActiveScope: (scope: string) => void;

	/** True si le projet courant a été ouvert via un token de partage (lecture seule). */
	isSharedProject: boolean;
	/** Token de partage du projet courant (si le propriétaire l'a partagé), null sinon. */
	shareToken: string | null;
	/**
	 * True entre le clic sur « Partager » d'un utilisateur non connecté et l'issue de la modale
	 * de connexion : si la connexion réussit, le partage reprend automatiquement.
	 */
	pendingShareAfterAuth: boolean;
	shareProject: () => Promise<void>;
	moveToCloudAndShare: () => Promise<void>;
	unshareProject: () => Promise<void>;
	resolveDraftConflict: (choice: "draft" | "real") => Promise<void>;

	//=============== SIMULATION ===============
	mode: ProjectMode;
	simulationPaused: boolean;
	simulationMode: SimulationMode;
	analysisHasErrors: boolean;
	analysisHasWarnings: boolean;
	analysisErrors: AnalysisIssues;
	analysisWarnings: AnalysisIssues;
	setAnalysisResultVisible: (visible: boolean) => void;
	setWatchTablesVisible: (visible: boolean) => void;
	plcConfig: PLCConfig;
	/**
	 * The current values of the variables during simulation, used to display them in the UI
	 */
	simulationVariablesStates: Record<string, SimulationVariableState>;
	/**
	 * Current values of the expressions watched during simulation (e.g. a transition's
	 * receptivity), indexed by the id chosen when the expression was registered.
	 *
	 * Held here, in the reactive state, rather than in a private field mutated by the manager:
	 * a Zustand selector only re-runs when the piece of state it reads actually changes.
	 */
	evaluableExpressionsValues: Record<string, unknown>;
	/**
	 * Variables actuellement forcées pendant la simulation : id de variable → valeur imposée.
	 * Miroir réactif de la table de forçage du PLC, pour permettre à l'UI de savoir quelles
	 * variables sont forcées sans interroger le PLC directement.
	 */
	forcedVariables: Record<string, unknown>;
	simulationManager: SimulationManager;

	//=============== COMMANDS ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: ProjectCommandsStackManager;
	/**
	 * Undo/redo on the active document. See `undo-redo.ts` for the scoping rule.
	 */
	undoActiveScope: () => void;
	redoActiveScope: () => void;

	//=============== GRAFCETS ===============
	/**
	 * The grafcet stores values, indexed by grafcetId, to be able to update some components that are out of the grafcet context
	 */
	grafcetsStoresValues: Record<string, GrafcetStoreValues>;
	grafcetsStoresManagers: Record<string, GrafcetStoreManagers>; //The managers are used to call functions that are not pure actions, for example the copyCutPasteManager to copy and paste elements
	grafcetsManager: GrafcetsManager;

	//=============== LADDERS ===============
	laddersStoresValues: Record<string, LadderStoreValues>;
	laddersStoresManagers: Record<string, LadderStoreManagers>;
	laddersManager: LaddersManager;

	//=============== HMI ===============
	hmiStoresValues: Record<string, HmiStoreValues>;
	hmiStoresManagers: Record<string, HmiStoreManagers>;
	hmiManager: HmiManager;
	/** Page HMI actuellement affichée par l'onglet "Simulation HMI" (voir
	 * `HmiSimulationPageView`), `null` si cet onglet n'est pas ouvert. Distinct de `activePageId` :
	 * la navigation entre pages HMI en simulation (voir `HmiManager.navigateHmiSimulation`) ne
	 * touche pas au système d'onglets de conception. */
	hmiSimulationActivePageId: string | null;

	//=============== PAGES ===============
	pagesData: Record<string, PageData>;
	pagesOrder: string[]; //The ids of the pages in the order they are displayed
	activePageId: string | null; //The id of the currently active page, or null if no page is active
	pagesManager: PagesManager;
}

export type ProjectStoreSetFunction = (
	partial:
		| ProjectStoreState
		| Partial<ProjectStoreState>
		| ((
				state: ProjectStoreState,
		  ) => ProjectStoreState | Partial<ProjectStoreState>),
) => void;

export type ProjectStoreGetFunction = () => ProjectStoreState;

function getInitialPagesData(): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;

	return pagesData;
}

const VARIABLES_PAGE_IDS: VariablesPageId[] = [
	"input-variables",
	"output-variables",
	"memory-variables",
];

/**
 * Reconstruit la `PageData` d'un id de page persisté (session ou URL, voir `restorePagesSession`
 * ci-dessous) — `null` si l'id ne correspond plus à rien (programme supprimé depuis). Les pages
 * "programme" (grafcet/ladder) ne portent que leur id en persistance : titre et type sont
 * retrouvés depuis le projet, jamais dupliqués dans la session.
 */
function resolvePageData(pageId: string, project: Project): PageData | null {
	if (pageId === PROJECT_STARTUP_PAGE_ID) return PROJECT_STARTUP_PAGE_DATA;
	if (pageId === PROJECT_PROPERTIES_PAGE_ID)
		return PROJECT_PROPERTIES_PAGE_DATA;
	if ((VARIABLES_PAGE_IDS as string[]).includes(pageId))
		return getVariablesPageData(pageId as VariablesPageId);
	const program = project.getProgram(pageId);
	if (program)
		return { id: program.id, title: program.name, type: program.type };
	const hmiPage = project.getHmiPage(pageId);
	if (hmiPage) return { id: hmiPage.id, title: hmiPage.name, type: "hmi" };
	return null;
}

/**
 * Rouvre les onglets d'une session de navigateur précédente (voir `pages-session-storage.ts`)
 * pour ce projet, et active en priorité `urlActiveId` (lien partagé) sur la page active
 * mémorisée par la session — voir la discussion produit associée. Appelée juste après
 * `_openProject`, qui a déjà posé l'état par défaut (page de démarrage seule) : si rien n'est
 * restaurable (aucune session, id d'URL introuvable), cet état par défaut reste inchangé.
 */
function restorePagesSession(
	set: ProjectStoreSetFunction,
	get: ProjectStoreGetFunction,
	project: Project,
	urlActiveId: string | null,
) {
	const session = getPagesSession(project.id);
	if (!session && !urlActiveId) return;

	set(() => ({ pagesData: {}, pagesOrder: [], activePageId: null }));
	const pagesManager = get().pagesManager;
	let opened = false;
	for (const id of session?.pagesOrder ?? []) {
		const pageData = resolvePageData(id, project);
		if (!pageData) continue; //programme supprimé depuis l'enregistrement de la session
		pagesManager.openPage(pageData);
		opened = true;
	}

	const desiredActiveId = urlActiveId ?? session?.activePageId ?? null;
	const activePageData = desiredActiveId
		? resolvePageData(desiredActiveId, project)
		: null;
	if (activePageData) {
		//Déjà ouverte -> l'active simplement ; sinon l'ouvre (et l'active, voir PagesManager.openPage)
		pagesManager.openPage(activePageData);
		opened = true;
	}

	if (!opened) {
		//Rien de la session n'a pu être restauré (tout supprimé depuis) : revenir à la page de démarrage
		const initialPagesData = getInitialPagesData();
		set(() => ({
			pagesData: initialPagesData,
			pagesOrder: Object.keys(initialPagesData),
			activePageId: Object.keys(initialPagesData)[0],
		}));
	}
}

const AUTO_SAVE_INTERVAL_MS = 30_000;

export const createProjectStore = () => {
	let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
	const _openProject = async (
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
		project: Project,
	) => {
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
	};

	const _newProject = async (
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
		templateId: string | null = null,
		variant: "exercise" | "solution" = "exercise",
	) => {
		let project: Project;
		if (templateId !== null) {
			const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
			if (template) {
				project =
					variant === "solution" && template.solution
						? template.solution()
						: template.create();
			} else {
				project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
			}
		} else {
			project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
		}
		await _openProject(set, get, project);
	};

	// Abandon explicite des modifications en cours : le brouillon auto-sauvegardé du projet
	// courant ne doit pas ressusciter les changements rejetés à la prochaine ouverture.
	const _discardCurrentDraft = (get: ProjectStoreGetFunction) => {
		const project = get().project;
		if (project) deleteDraft(project.id);
	};

	const _closeProject = async (
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
	) => {
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
	};

	return createStore<ProjectStoreState>((set, get) => ({
		project: null,
		hasUnsavedChanges: false,
		ui: {
			unsavedChangesDialogVisible: false,
			unsavedChangesDialogMessage: null,
			onUnsavedChangesDialogCancel: null,
			onUnsavedChangesDialogContinue: null,
			openModalVisible: false,
			newProjectModalVisible: false,
			exportModalVisible: false,
			pdfExportModalVisible: false,
			saveAsModalVisible: false,
			shareModalVisible: false,
			shareRequiresCloudModalVisible: false,
			analysisResultVisible: false,
			watchTablesVisible: false,
			draftConflictModal: { visible: false, projectId: null, draftData: null },
		},
		savingProject: false,
		projectRepository: new HybridProjectRepository(),
		isSharedProject: false,
		shareToken: null,
		pendingShareAfterAuth: false,
		activeScope: "project",
		activeScopeType: "project",
		variablesManager: new VariablesManager(set, get),

		getProject: () => get().project,
		openProject: async (projectId: string, preferDraft = false) => {
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
			await _openProject(set, get, project);
			set(() => ({ isSharedProject: false, hasUnsavedChanges: fromDraft }));
			restorePagesSession(set, get, project, urlActiveId);
			return true;
		},

		openProjectByShareToken: async (token: string) => {
			const supabase = new SupabaseProjectRepository();
			const project = await supabase.getByShareToken(token);
			if (!project) return false;
			await _openProject(set, get, project);
			set(() => ({ isSharedProject: true, shareToken: null }));
			clearShareTokenFromUrl();
			return true;
		},

		newProject: async () => {
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
						_discardCurrentDraft(get);
						openModal();
					},
				},
			}));
		},

		newProjectFromTemplate: async (
			templateId: string | null,
			variant: "exercise" | "solution" = "exercise",
		) => {
			set((state) => ({ ui: { ...state.ui, newProjectModalVisible: false } }));
			await _newProject(set, get, templateId, variant);
		},

		saveProject: async () => {
			const project = get().project;
			if (!project) return false;
			// Projet ouvert en lecture seule via un lien de partage : Enregistrer = Enregistrer sous
			if (get().isSharedProject) {
				set((state) => ({ ui: { ...state.ui, saveAsModalVisible: true } }));
				return false;
			}
			const newProject = project.copy();
			newProject.touch(); //Update the project's last modified date
			set(() => ({ savingProject: true }));

			const result = await get().projectRepository.save(newProject);
			if (!result.ok) {
				//Ne jamais annoncer un enregistrement qui n'a pas eu lieu : le projet reste
				//marqué comme modifié pour que l'utilisateur puisse réessayer
				set(() => ({ savingProject: false }));
				toast.error(SAVE_FAILURE_MESSAGES[result.reason]);
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
		},

		saveProjectAs: async (name: string) => {
			const project = get().project;
			if (!project) return false;
			const copy = project.copy();
			copy.id = createRandomId();
			copy.name = name.trim() || project.name;
			copy.touch();
			set(() => ({ savingProject: true }));
			const result = await get().projectRepository.save(copy);
			if (!result.ok) {
				set(() => ({ savingProject: false }));
				toast.error(SAVE_FAILURE_MESSAGES[result.reason]);
				console.error("Failed to save the project:", result.cause);
				return false;
			}
			await _openProject(set, get, copy);
			set(() => ({ hasUnsavedChanges: false, savingProject: false }));
			// Le brouillon de l'original n'est pas supprimé : seul un enregistrement explicite
			// sur ce projet l'effacera. La copie démarre sans brouillon.
			return true;
		},

		closeProject: async () => {
			if (!get().hasUnsavedChanges) {
				await _closeProject(set, get);
				return;
			}
			set((state) => ({
				ui: {
					...state.ui,
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage: null,
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => {
						_discardCurrentDraft(get);
						void _closeProject(set, get);
					},
				},
			}));
		},

		setProjectName: (newName: string) => {
			const project = get().project;
			if (!project) return;
			if (project.name === newName) return; //No change
			set(() => {
				const newProject = project.copy();
				newProject.name = newName;
				return { project: newProject, hasUnsavedChanges: true };
			});
		},

		setProjectAuthor: (newAuthor: string) => {
			const project = get().project;
			if (!project) return;
			if (project.author === newAuthor) return; //No change
			set(() => {
				const newProject = project.copy();
				newProject.author = newAuthor;
				return { project: newProject, hasUnsavedChanges: true };
			});
		},

		setProjectDialect: (dialect: Dialect) => {
			const project = get().project;
			if (!project) return;
			if (project.dialect === dialect) return;
			set(() => {
				const newProject = project.copy();
				//Traduit les mots-clés des expressions existantes : sans quoi elles deviendraient
				//illisibles dans le nouveau dialecte
				newProject.setDialect(dialect);
				return { project: newProject, hasUnsavedChanges: true };
			});
			//Les grafcets ouverts détiennent leur propre copie : ils doivent adopter la nouvelle
			get().grafcetsManager.syncMountedStoresFromProject();
		},

		setUnsavedChangesDialogVisible: (visible: boolean) => {
			set((state) => ({
				ui: { ...state.ui, unsavedChangesDialogVisible: visible },
			}));
		},

		setNewProjectModalVisible: (visible: boolean) => {
			set((state) => ({
				ui: { ...state.ui, newProjectModalVisible: visible },
			}));
		},

		setOpenModalVisible: (visible: boolean) => {
			if (!visible) {
				set((state) => ({ ui: { ...state.ui, openModalVisible: false } }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set((state) => ({ ui: { ...state.ui, openModalVisible: true } }));
			} else {
				set((state) => ({
					ui: {
						...state.ui,
						unsavedChangesDialogVisible: true,
						unsavedChangesDialogMessage: null,
						onUnsavedChangesDialogCancel: null,
						onUnsavedChangesDialogContinue: () => {
							_discardCurrentDraft(get);
							set((state) => ({
								ui: { ...state.ui, openModalVisible: true },
							}));
						},
					},
				}));
			}
		},

		setExportModalVisible: (visible: boolean) => {
			if (!visible) {
				set((state) => ({ ui: { ...state.ui, exportModalVisible: false } }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set((state) => ({ ui: { ...state.ui, exportModalVisible: true } }));
			} else {
				set((state) => ({
					ui: {
						...state.ui,
						unsavedChangesDialogVisible: true,
						unsavedChangesDialogMessage:
							"Vous avez des modifications non enregistrées. Voulez-vous les enregistrer avant d'exporter ?",
						onUnsavedChangesDialogCancel: null,
						onUnsavedChangesDialogContinue: () =>
							set((state) => ({
								ui: { ...state.ui, exportModalVisible: true },
							})),
					},
				}));
			}
		},

		setPdfExportModalVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, pdfExportModalVisible: visible } }));
		},

		setSaveAsModalVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, saveAsModalVisible: visible } }));
		},

		setShareModalVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, shareModalVisible: visible } }));
		},

		setShareRequiresCloudModalVisible: (visible: boolean) => {
			set((state) => ({
				ui: { ...state.ui, shareRequiresCloudModalVisible: visible },
			}));
		},

		startAutoSave: () => {
			if (autoSaveTimer !== null) return;
			autoSaveTimer = setInterval(() => {
				const { project, hasUnsavedChanges, isSharedProject } = get();
				if (!project || !hasUnsavedChanges || isSharedProject) return;
				saveDraft(project.id, project.name, JSON.stringify(project));
			}, AUTO_SAVE_INTERVAL_MS);
		},

		stopAutoSave: () => {
			if (autoSaveTimer === null) return;
			clearInterval(autoSaveTimer);
			autoSaveTimer = null;
		},

		shareProject: async () => {
			const project = get().project;
			if (!project) return;
			const repo = get().projectRepository;
			if (!isShareable(repo)) return;

			// Non connecté : on ouvre la modale de connexion et on reprend le partage dès
			// qu'une session s'ouvre. Si la modale se ferme sans connexion, on abandonne.
			if (!authStore.getState().user) {
				if (get().pendingShareAfterAuth) return;
				set({ pendingShareAfterAuth: true });
				const unsubscribe = authStore.subscribe((authState) => {
					if (authState.user) {
						unsubscribe();
						set({ pendingShareAfterAuth: false });
						void get().shareProject();
					} else if (!authState.ui.authModalVisible) {
						unsubscribe();
						set({ pendingShareAfterAuth: false });
					}
				});
				authStore
					.getState()
					.setAuthModalVisible(true, "Connectez-vous pour partager ce projet.");
				return;
			}

			// Connecté mais projet stocké en local : il doit d'abord passer dans le cloud.
			if (
				repo instanceof HybridProjectRepository &&
				repo.locationOf(project.id) === "local"
			) {
				set((state) => ({
					ui: { ...state.ui, shareRequiresCloudModalVisible: true },
				}));
				return;
			}

			// Vérifie si un token existe déjà
			const existing = await repo.getShareToken(project.id);
			if (existing) {
				set(() => ({ shareToken: existing }));
				set((state) => ({ ui: { ...state.ui, shareModalVisible: true } }));
				return;
			}
			const result = await repo.createShareToken(project.id);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			set(() => ({ shareToken: result.token }));
			set((state) => ({ ui: { ...state.ui, shareModalVisible: true } }));
		},

		moveToCloudAndShare: async () => {
			const project = get().project;
			if (!project) return;
			const repo = get().projectRepository;
			if (!(repo instanceof HybridProjectRepository)) return;
			const result = await repo.moveToCloud(project);
			if (!result.ok) {
				toast.error(
					"Le projet n'a pas pu être envoyé dans le cloud. Vérifiez votre connexion.",
				);
				return;
			}
			set((state) => ({
				ui: { ...state.ui, shareRequiresCloudModalVisible: false },
			}));
			await get().shareProject();
		},

		unshareProject: async () => {
			const project = get().project;
			if (!project) return;
			const repo = get().projectRepository;
			if (!isShareable(repo)) return;
			const result = await repo.deleteShareToken(project.id);
			if (!result.ok) {
				toast.error("Impossible de révoquer le partage.");
				return;
			}
			set(() => ({ shareToken: null }));
		},

		resolveDraftConflict: async (choice: "draft" | "real") => {
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
					await _openProject(set, get, project);
					set(() => ({ isSharedProject: false, hasUnsavedChanges: true }));
					restorePagesSession(set, get, project, urlActiveId);
				} catch {
					toast.error("Le brouillon est corrompu et n'a pas pu être ouvert.");
				}
			} else {
				// Partir du projet réel : supprimer le brouillon
				deleteDraft(projectId);
			}
		},

		setActiveScope: (scope: string) => {
			const previousScope = get().activeScope;
			const pagesData = get().pagesData;
			let scopeType: ScopeType = "project";
			if (scope && pagesData[scope]) {
				if (pagesData[scope].type === "grafcet") {
					scopeType = "grafcet";
				} else if (pagesData[scope].type === "ladder") {
					scopeType = "ladder";
				} else if (pagesData[scope].type === "hmi") {
					scopeType = "hmi";
				}
			}
			set(() => ({ activeScope: scope, activeScopeType: scopeType }));
			//If the scope is a grafcet, set the focus on the grafcet flow
			//Prevent the focus change if the scope didn't change, to avoid issues with the grafcet flow shortcuts when the user clicks on the flow while it's already active
			if (scope && previousScope !== scope && scopeType === "grafcet") {
				get().grafcetsManager.getActiveStoreManagers()?.viewManager.focus();
			}
		},

		//=============== SIMULATION ===============
		mode: ProjectMode.DESIGN,
		simulationPaused: false,
		simulationMode: SimulationManager.getPersistedSimulationMode(),
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: emptyAnalysisIssues(),
		analysisWarnings: emptyAnalysisIssues(),
		setAnalysisResultVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, analysisResultVisible: visible } }));
		},
		setWatchTablesVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, watchTablesVisible: visible } }));
		},
		plcConfig: {
			scanTimeMs: 100,
		},
		simulationVariablesStates: {},
		evaluableExpressionsValues: {},
		forcedVariables: {},
		simulationManager: new SimulationManager(
			set,
			get,
			new ToastSimulationNotifier(),
		),

		//=============== COMMANDS STACK ===============
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		commandsStackManager: new ProjectCommandsStackManager(set, get),
		undoActiveScope: () => performUndo(get()),
		redoActiveScope: () => performRedo(get()),

		//=============== GRAFCETS ===============
		grafcetsStoresValues: {},
		grafcetsStoresManagers: {},
		grafcetsManager: new GrafcetsManager(set, get),

		//=============== LADDERS ===============
		laddersStoresValues: {},
		laddersStoresManagers: {},
		laddersManager: new LaddersManager(set, get),

		//=============== HMI ===============
		hmiStoresValues: {},
		hmiStoresManagers: {},
		hmiManager: new HmiManager(set, get),
		hmiSimulationActivePageId: null,

		//=============== PAGES ===============
		pagesData: getInitialPagesData(),
		pagesOrder: [PROJECT_STARTUP_PAGE_ID],
		activePageId: PROJECT_STARTUP_PAGE_ID,
		pagesManager: new PagesManager(set, get),
	}));
};
