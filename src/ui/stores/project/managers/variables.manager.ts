import {
	VariableUpdatableFields,
	VariableUpdatableFieldsWithId,
} from "@/schemas/variable/variable.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
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
		byMnemonic: Map<string, Variable>;
		byAddress: Map<string, Variable>;
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
			const byMnemonic = new Map<string, Variable>();
			const byAddress = new Map<string, Variable>();
			for (const v of project.variables) {
				byMnemonic.set(v.mnemonic, v);
				if (v.address) byAddress.set(v.address.toLowerCase(), v);
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
		return this.getIndex()?.byMnemonic.get(mnemonic)?.id ?? false;
	}

	/**
	 * @param mnemonic
	 * @returns True if a timer or counter block of the current project already uses this name
	 */
	isMnemonicUsedByBlock(mnemonic: string): boolean {
		return this.getStoreState().project?.isBlockNameTaken(mnemonic) ?? false;
	}

	/**
	 *
	 * @param address
	 * @returns The variable owning the address or null if not found
	 */
	getByAddress(address: string): Variable | null {
		if (!address || address.trim() === "") return null;
		return this.getIndex()?.byAddress.get(address.toLowerCase()) ?? null;
	}

	/** @returns The variables actually created (those with a blank or already used mnemonic are skipped). */
	addVariables(
		data: VariableUpdatableFields[],
	): VariableUpdatableFieldsWithId[] {
		const project = this.getStoreState().project;
		if (!project) return [];
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot add variable in non-design mode");
			return [];
		}
		const { commands, variablesToAdd } = VariablesCommandsFactory.onAddVariable(
			project,
			data,
		);
		this.getStoreState().commandsStackManager.executeOperation(commands);
		return variablesToAdd;
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
