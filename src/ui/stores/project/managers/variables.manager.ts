import { VariableUpdatableFields } from "@/schemas/variable/variable.schema";
import VariablesCommandsFactory from "../factories/variables-commands.factory";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

export default class VariablesManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	/**
	 *
	 * @param mnemonic
	 * @returns The id of the variable owning the mnemonic or false if not found
	 */
	existsByMnemonic(mnemonic: string): string | false {
		const project = this.getStoreState().project;
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
		const project = this.getStoreState().project;
		if (!project) return false;
		if (!address || address.trim() === "") return false;
		const variable = project.variables.find((v) => v.address?.toLowerCase() === address.toLowerCase());
		return variable ? variable.id : false;
	}

	addVariables(data: VariableUpdatableFields[]): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot add variable in non-design mode");
			return;
		}
		const { commands } = VariablesCommandsFactory.onAddVariable(project, data);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	updateVariable(variableId: string, data: Partial<VariableUpdatableFields>): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot update variable in non-design mode");
			return;
		}
		const { commands } = VariablesCommandsFactory.onUpdateVariable(project, variableId, data);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	removeVariables(variablesIds: string[]): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot remove variable in non-design mode");
			return;
		}
		const { commands } = VariablesCommandsFactory.onRemoveVariable(project, variablesIds);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}
}
