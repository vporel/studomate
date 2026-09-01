import Project from "@/schemas/project/project.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectRepository, {
	StorageLocation,
} from "@/persistence/repositories/project.repository";
import { AnalysisIssues } from "@/bridge/analysis-issues.mapper";
import { GrafcetStoreState } from "../grafcet/grafcet.store";
import { HmiStoreState } from "../hmi/hmi.store";
import { LadderStoreState } from "../ladder/ladder.store";
import ProjectCommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import LaddersManager from "./managers/ladders.manager";
import PagesManager from "./managers/pages.manager";
import HmiManager from "./managers/hmi.manager";
import SimulationManager from "./managers/simulation/simulation.manager";
import VariablesManager from "./managers/variables.manager";
import ProjectLifecycleManager from "./managers/lifecycle.manager";
import ProjectSharingManager from "./managers/sharing.manager";
import { ProjectMode } from "./ProjectMode.enum";
import { SimulationMode } from "./SimulationMode.enum";

type SimpleCallback = () => void;

export type PageType =
	| "project-startup"
	| "project-properties"
	| "preferences"
	| "exercise"
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
	| "moveSelectedWidgets"
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
	/**
	 * Affichée quand `saveProject` échoue avec `reason: "conflict"` : un autre appareil a
	 * enregistré ce même projet cloud entre son chargement ici et cette tentative d'écriture.
	 */
	cloudConflictModalVisible: boolean;
	/**
	 * Affichée au premier enregistrement d'un projet neuf tant qu'aucune préférence de lieu de
	 * stockage n'existe (voir `preferences.storage.ts`), ou en repli quand la préférence est
	 * "cloud" mais qu'aucune session n'est active. `onSaveLocationChosen` porte le choix retenu
	 * (`null` si l'utilisateur annule) — appelé par la modale, jamais lu ailleurs.
	 */
	saveLocationModalVisible: boolean;
	onSaveLocationChosen: ((location: StorageLocation | null) => void) | null;
}

/**
 * `restoring` tant qu'un projet dont l'id (ou le token de partage) voyage dans l'URL est en
 * cours de réouverture au démarrage : l'écran affiche alors directement le loader, pas la page
 * de démarrage. Repasse à `idle` dès que le projet est ouvert ou que la réouverture échoue.
 */
export type ProjectBootStatus = "restoring" | "idle";

export interface ProjectStoreState {
	//Project
	project: Project | null; //null when no project is opened
	bootStatus: ProjectBootStatus;
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
	lifecycleManager: ProjectLifecycleManager;

	getProject: () => Project | null;
	finishBoot: () => void; // Sort de l'état `restoring` quand la réouverture au démarrage a échoué

	setProjectName: (newName: string) => void;
	setProjectAuthor: (newAuthor: string) => void;
	setProjectDialect: (dialect: Dialect) => void;
	/** Met à jour l'énoncé du projet. Une valeur vide (après trim) retire l'énoncé. */
	setExerciseStatement: (statement: string) => void;

	setUnsavedChangesDialogVisible: (visible: boolean) => void;
	setNewProjectModalVisible: (visible: boolean) => void;
	setOpenModalVisible: (visible: boolean) => void;
	setExportModalVisible: (visible: boolean) => void;
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
	sharingManager: ProjectSharingManager;

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
