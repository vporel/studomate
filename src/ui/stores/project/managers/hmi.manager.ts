import { deepObjectsComparison } from "@/lib/object";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import HmiPage, { HMI_PAGE_NAME_LABEL } from "@/schemas/hmi/hmi-page.schema";
import {
	HmiStoreManagers,
	HmiStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

const COMMANDS_STACK_SIZE = 100;

/** Id fixe de l'unique onglet "Simulation HMI" (voir `HmiSimulationPageView`) — pas lié à une
 * page HMI précise, contrairement aux onglets `"hmi"` classiques. */
export const HMI_SIMULATION_PAGE_ID = "hmi-simulation";

export default class HmiManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	/**
	 * Undo history de chaque page HMI, tenu ici plutôt que dans son store : un store est créé au
	 * montage de la page et abandonné à sa fermeture, garder l'historique là-bas signifierait que
	 * fermer un onglet détruit silencieusement l'historique. Le garder au niveau projet le fait
	 * survivre à la page (même principe que `AbstractProgramsManager`).
	 */
	private commandsStacks: Map<string, CommandsStack<HmiPage>> = new Map();

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	getCommandsStack(hmiPageId: string): CommandsStack<HmiPage> {
		let stack = this.commandsStacks.get(hmiPageId);
		if (!stack) {
			stack = new CommandsStack<HmiPage>(COMMANDS_STACK_SIZE);
			this.commandsStacks.set(hmiPageId, stack);
		}
		return stack;
	}

	clearCommandsStacks(): void {
		this.commandsStacks.clear();
	}

	getActiveStoreValues(): HmiStoreValues | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "hmi" || !activeScope) return null;
		return this.getStoreState().hmiStoresValues[activeScope] || null;
	}

	getActiveStoreManagers(): HmiStoreManagers | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "hmi" || !activeScope) return null;
		return this.getStoreState().hmiStoresManagers[activeScope] || null;
	}

	setStoreValues(hmiPageId: string, values: HmiStoreValues): void {
		this.setStoreState((state) => ({
			hmiStoresValues: {
				...state.hmiStoresValues,
				[hmiPageId]: { ...state.hmiStoresValues[hmiPageId], ...values },
			},
		}));
	}

	registerStoreManager(hmiPageId: string, managers: HmiStoreManagers): void {
		this.setStoreState((state) => ({
			hmiStoresManagers: { ...state.hmiStoresManagers, [hmiPageId]: managers },
		}));
	}

	deleteStoreManager(hmiPageId: string): void {
		this.setStoreState((state) => {
			const current = { ...state.hmiStoresManagers };
			delete current[hmiPageId];
			return { hmiStoresManagers: current };
		});
	}

	/** @param name Absent : auto-généré au format "Vue HMI_N", unique parmi les pages du projet
	 * (voir `Project.nextHmiPageName`). */
	newHmiPage(name?: string): HmiPage | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) return null;
		const resolvedName = name ?? project.nextHmiPageName(HMI_PAGE_NAME_LABEL);
		const newProject = project.copy();
		const page = newProject.createHmiPage(resolvedName);
		this.getStoreState().pagesManager.openPage({
			id: page.id,
			type: "hmi",
			title: page.name,
		});
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
		return page;
	}

	deleteHmiPage(hmiPageId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) return;
		const newProject = project.copy();
		newProject.deleteHmiPage(hmiPageId);
		this.commandsStacks.delete(hmiPageId);
		this.getStoreState().pagesManager.closePage(hmiPageId);
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
	}

	renameHmiPage(hmiPageId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) return;
		const newProject = project.copy();
		const page = newProject.getHmiPage(hmiPageId);
		if (!page) return;
		page.name = newName;
		const pagesData = this.getStoreState().pagesData;
		if (pagesData[hmiPageId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[hmiPageId].title = newName;
			this.setStoreState(() => ({ pagesData: newPagesData }));
		}
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
	}

	/** Une seule page principale à la fois dans tout le projet (voir `Project.setMainHmiPage`) —
	 * pas de restriction de mode : éditer une page HMI n'a aucune incidence sur l'exécution du
	 * programme, donc reste possible pendant la simulation (voir `HmiPageContent`). */
	setMainHmiPage(hmiPageId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const newProject = project.copy();
		newProject.setMainHmiPage(hmiPageId);
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
	}

	/** Ouvre l'onglet "Simulation HMI" sur la page principale du projet (voir
	 * `Project.getMainHmiPage`) — sans effet si le projet n'a aucune page HMI. Appelé à l'entrée en
	 * simulation (voir `SimulationManager.setSimulationMode`). */
	openHmiSimulationPageIfAny(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mainPage = project.getMainHmiPage();
		if (!mainPage) return;
		this.setStoreState(() => ({ hmiSimulationActivePageId: mainPage.id }));
		this.getStoreState().pagesManager.openPage({
			id: HMI_SIMULATION_PAGE_ID,
			type: "hmi-simulation",
			title: "Simulation HMI",
		});
	}

	/** Ferme l'onglet "Simulation HMI" — appelé à la sortie de simulation (voir
	 * `SimulationManager.setDesignMode`) : les valeurs qu'elle affiche n'ont plus de sens hors
	 * simulation. */
	closeHmiSimulationPage(): void {
		this.getStoreState().pagesManager.closePage(HMI_SIMULATION_PAGE_ID);
		this.setStoreState(() => ({ hmiSimulationActivePageId: null }));
	}

	/** Change la page affichée par l'onglet "Simulation HMI" — utilisé par l'action
	 * "changer de page" déclenchée en simulation (voir `executeHmiAction`). Ne touche pas au
	 * système d'onglets de conception : la navigation reste interne à cet unique onglet. */
	navigateHmiSimulation(hmiPageId: string): void {
		this.setStoreState(() => ({ hmiSimulationActivePageId: hmiPageId }));
	}

	getHmiPageOrThrow(hmiPageId: string): HmiPage {
		const project = this.getStoreState().project;
		if (!project) throw new Error("Aucun projet ouvert");
		const page = project.getHmiPage(hmiPageId);
		if (!page) throw new Error(`Page HMI introuvable : ${hmiPageId}`);
		return page;
	}

	/**
	 * Répercute dans le projet la page HMI produite par la pile de commandes du store — même
	 * garde-fou que `AbstractProgramsManager.updateProgramData` : sans la comparaison profonde,
	 * chaque changement de référence (y compris une simple sélection de widget, qui ne touche
	 * pas `hmiPage`) redéclencherait une écriture projet.
	 */
	updateHmiPageData(page: HmiPage): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const existing = project.getHmiPage(page.id);
		if (!existing) return;
		if (!deepObjectsComparison(existing, page)) {
			this.setStoreState(() => {
				const newProject = project.copy();
				newProject.hmiPages[page.id] = page.copy();
				return { project: newProject, hasUnsavedChanges: true };
			});
		}
	}
}
