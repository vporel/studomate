import { VariableUpdatableFields } from "@/schemas/variable/variable.schema";
import Project from "@/schemas/project/project.schema";
import VariablesCommandsFactory from "../factories/variables-commands.factory";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

export default class VariablesManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;
	/** Index mnémonique/adresse → id, reconstruit dès que l'identité de `project` change (toute
	 * mutation produit un nouveau `Project`). Évite un `.find` linéaire à chaque frappe dans une
	 * cellule en édition (voir `preProcessEditCellProps` de `useDataGridColums`). */
	private index?: {
		project: Project;
		byMnemonic: Map<string, string>;
		byAddress: Map<string, string>;
	};

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	private getIndex() {
		const project = this.getStoreState().project;
		if (!project) return undefined;
		if (this.index?.project !== project) {
			const byMnemonic = new Map<string, string>();
			const byAddress = new Map<string, string>();
			for (const v of project.variables) {
				byMnemonic.set(v.mnemonic, v.id);
				if (v.address) byAddress.set(v.address.toLowerCase(), v.id);
			}
			this.index = { project, byMnemonic, byAddress };
		}
		return this.index;
	}

	/**
	 *
	 * @param mnemonic
	 * @returns The id of the variable owning the mnemonic or false if not found
	 */
	existsByMnemonic(mnemonic: string): string | false {
		return this.getIndex()?.byMnemonic.get(mnemonic) ?? false;
	}

	/**
	 *
	 * @param address
	 * @returns The id of the variable owning the address or false if not found
	 */
	existsByAddress(address: string): string | false {
		if (!address || address.trim() === "") return false;
		return this.getIndex()?.byAddress.get(address.toLowerCase()) ?? false;
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

	updateVariable(
		variableId: string,
		newData: Partial<VariableUpdatableFields>,
	): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot update variable in non-design mode");
			return;
		}
		const { commands } = VariablesCommandsFactory.onUpdateVariable(
			project,
			variableId,
			newData,
		);
		//Renaming a mnemonic also rewrites the expressions of every grafcet: this is done
		//inside VariablesUpdateCommand, so that it reaches the closed grafcets too and that
		//undo stays symmetric
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	removeVariables(variablesIds: string[]): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot remove variable in non-design mode");
			return;
		}
		const { commands } = VariablesCommandsFactory.onRemoveVariable(
			project,
			variablesIds,
		);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}
}
