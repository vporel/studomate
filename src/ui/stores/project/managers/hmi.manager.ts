import type { Locale } from "@/i18n/config";
import { deepObjectsComparison } from "@/lib/object";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import type { HmiAction } from "@/schemas/hmi/hmi-widget.schema";
import Project from "@/schemas/project/project.schema";
import defaultContent from "../default-content";
import { canEditActivePage } from "../editability";
import type { ProjectStoreAnalytics } from "../environment/project-store-environment";
import { getHmiPageData } from "../pages-data";
import {
	HmiStoreManagers,
	HmiStoreValues,
	ProjectStoreState,
} from "../project.store";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store.types";
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

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
		analytics: ProjectStoreAnalytics,
		private readonly getLocale: () => Locale,
	) {
		super(setStoreState, getStoreState, analytics);
	}

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

	/** @param name When absent, generated as "<default name>_N" in the interface language
	 * ("Page HMI_1", "HMI page_1"), unique among the project's pages (see
	 * `Project.nextHmiPageName`). */
	newHmiPage(name?: string): HmiPage | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (!canEditActivePage(this.getStoreState())) return null;
		const resolvedName =
			name ??
			project.nextHmiPageName(defaultContent(this.getLocale()).hmiPageName);
		const newProject = project.copy();
		const page = newProject.createHmiPage(resolvedName);
		this.analytics.trackEvent("hmi-page-created");
		this.getStoreState().pagesManager.openPage(getHmiPageData(page));
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
		return page;
	}

	deleteHmiPage(hmiPageId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (!canEditActivePage(this.getStoreState())) return;
		this.deleteDocumentById(hmiPageId, (p) => p.deleteHmiPage(hmiPageId));
	}

	renameHmiPage(hmiPageId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (!canEditActivePage(this.getStoreState())) return;
		this.renameDocumentById(hmiPageId, newName);
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
	 * "changer de page" déclenchée en simulation (voir `executeAction`). Ne touche pas au
	 * système d'onglets de conception : la navigation reste interne à cet unique onglet. */
	navigateHmiSimulation(hmiPageId: string): void {
		this.setStoreState(() => ({ hmiSimulationActivePageId: hmiPageId }));
	}

	/** Exécute une action déclenchée par un événement de widget (voir `HmiWidgetEvents`). */
	executeAction(action: HmiAction): void {
		switch (action.type) {
			case "navigate-to-page":
				this.navigateHmiSimulation(action.targetHmiPageId);
				break;
		}
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
			this.setStoreState(() => ({
				project: project.copyWithHmiPage(page),
				hasUnsavedChanges: true,
			}));
		}
	}
}
