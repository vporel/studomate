import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "./project-store-types";

export default class PagesManager {
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setProjectStore = set;
		this.getProjectStore = get;
	}
}
