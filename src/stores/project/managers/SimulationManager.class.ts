import { toast } from "react-toastify";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project-store-types";

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	analyze() {
		const project = this.getStoreState().project;
		if (!project) return;
		const grafcets = Object.values(project.grafcets);
		if (grafcets.length === 0) {
			toast.warn("Aucune analyse possible : aucun grafcet n'est défini");
			return;
		}
	}
}
