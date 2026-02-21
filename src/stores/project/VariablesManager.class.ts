import { VariableUpdatableFields } from "@/schemas/variable/Variable.class";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "./project-store-types";

export default class VariablesManager {
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setProjectStore = set;
		this.getProjectStore = get;
	}

	addVariable(data: VariableUpdatableFields): void {}

	updateVariable(variableId: string, data: Partial<VariableUpdatableFields>): void {}

	deleteVariable(variableId): void {}
}
