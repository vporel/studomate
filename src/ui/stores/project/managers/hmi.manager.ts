import { deepObjectsComparison } from "@/lib/object";
import Project from "@/schemas/project/project.schema";
import HmiPage, { HMI_PAGE_NAME_LABEL } from "@/schemas/hmi/hmi-page.schema";
import {
	HmiStoreManagers,
	HmiStoreValues,
	ProjectStoreState,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";
import trackEvent from "@/ui/services/analytics";
import AbstractDocumentsManager from "./abstract-documents.manager";

/** Id fixe de l'unique onglet "Simulation HMI" (voir `HmiSimulationPageView`) — pas lié à une
 * page HMI précise, contrairement aux onglets `"hmi"` classiques. */
export const HMI_SIMULATION_PAGE_ID = "hmi-simulation";

export default class HmiManager extends AbstractDocumentsManager<
	HmiPage,
	HmiStoreValues,
	HmiStoreManagers
> {
	protected readonly documentType = "hmi" as const;

	protected getDocument(project: Project, id: string): HmiPage | undefined {
		return project.getHmiPage(id);
	}

	protected getStoresValues(
		state: ProjectStoreState,
	): Record<string, HmiStoreValues> {
		return state.hmiStoresValues;
	}

	protected setStoresValues(
		values: Record<string, HmiStoreValues>,
	): Partial<ProjectStoreState> {
		return { hmiStoresValues: values };
	}

	protected getStoresManagers(
		state: ProjectStoreState,
	): Record<string, HmiStoreManagers> {
		return state.hmiStoresManagers;
	}

	protected setStoresManagers(
		managers: Record<string, HmiStoreManagers>,
	): Partial<ProjectStoreState> {
		return { hmiStoresManagers: managers };
	}

	protected adoptDocument(managers: HmiStoreManagers, page: HmiPage): void {
		managers.adoptHmiPage(page);
	}

	protected getAdoptedDocument(
		managers: HmiStoreManagers,
	): HmiPage | undefined {
		return managers.getHmiPage();
	}

	/** @param name Absent : auto-généré au format "Page HMI_N", unique parmi les pages du projet
	 * (voir `Project.nextHmiPageName`). */
	newHmiPage(name?: string): HmiPage | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) return null;
		const resolvedName = name ?? project.nextHmiPageName(HMI_PAGE_NAME_LABEL);
		const newProject = project.copy();
		const page = newProject.createHmiPage(resolvedName);
		trackEvent("hmi-page-created");
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
		this.deleteCommandsStack(hmiPageId);
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
		// A mounted store pushes its own copy back to the project on its next change.
		this.syncMountedStoresFromProject();
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
		// A mounted store pushes its own copy back to the project on its next change.
		this.syncMountedStoresFromProject();
	}

	/** Ouvre l'onglet "Simulation HMI" sur la page principale du projet (voir
	 * `Project.getMainHmiPage`) — sans effet si le projet n'a aucune page HMI. Appelé à l'entrée en
	 * simulation (voir `SimulationManager.setSimulationMode`). Renvoie `true` si l'onglet a été
	 * ouvert. */
	openHmiSimulationPageIfAny(): boolean {
		const project = this.getStoreState().project;
		if (!project) return false;
		const mainPage = project.getMainHmiPage();
		if (!mainPage) return false;
		this.setStoreState(() => ({ hmiSimulationActivePageId: mainPage.id }));
		this.getStoreState().pagesManager.openPage({
			id: HMI_SIMULATION_PAGE_ID,
			type: "hmi-simulation",
			title: "Simulation HMI",
		});
		return true;
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
