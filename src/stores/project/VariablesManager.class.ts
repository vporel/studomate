import { VariableUpdatableFields } from "@/schemas/variable/Variable.class";
import CommandsStackManager from "./CommandsStackManager.class";
import VariablesCommandsFactory from "./factory/VariablesCommandsFactory.class";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "./project-store-types";

export default class VariablesManager {
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;
	private commandsStackManager: CommandsStackManager;

	constructor(
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
		commandsStackManager: CommandsStackManager,
	) {
		this.setProjectStore = set;
		this.getProjectStore = get;
		this.commandsStackManager = commandsStackManager;
	}

	/**
	 *
	 * @param mnemonic
	 * @returns The id of the variable owning the mnemonic or false if not found
	 */
	existsByMnemonic(mnemonic: string): string | false {
		const project = this.getProjectStore().project;
		if (!project) return false;
		const variable = project.variables.find((v) => v.mnemonic.toLowerCase() === mnemonic.toLowerCase());
		return variable ? variable.id : false;
	}

	/**
	 *
	 * @param address
	 * @returns The id of the variable owning the address or false if not found
	 */
	existsByAddress(address: string): string | false {
		const project = this.getProjectStore().project;
		if (!project) return false;
		if (!address || address.trim() === "") return false;
		const variable = project.variables.find((v) => v.address?.toLowerCase() === address.toLowerCase());
		return variable ? variable.id : false;
	}

	addVariables(data: VariableUpdatableFields[]): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const { commands } = VariablesCommandsFactory.onAddVariable(project, data);
		this.commandsStackManager.executeOperation(commands);
	}

	updateVariable(variableId: string, data: Partial<VariableUpdatableFields>): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const { commands } = VariablesCommandsFactory.onUpdateVariable(project, variableId, data);
		this.commandsStackManager.executeOperation(commands);
	}

	removeVariables(variablesIds: string[]): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const { commands } = VariablesCommandsFactory.onRemoveVariable(project, variablesIds);
		this.commandsStackManager.executeOperation(commands);
	}
}
