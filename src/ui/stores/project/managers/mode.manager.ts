import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

export default class ModeManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	setDesignMode() {
		this.setStoreState(() => ({ mode: ProjectMode.DESIGN }));
	}

	setSimulationMode() {
		this.setStoreState(() => ({ mode: ProjectMode.SIMULATION }));
	}
}
