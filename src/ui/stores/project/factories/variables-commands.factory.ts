import { deepObjectsComparison, extractFields } from "@/lib/object";
import AbstractProjectCommand from "@/schemas/project/commands/abstract-project.command";
import VariablesAddCommand from "@/schemas/project/commands/variables-add.command";
import VariablesRemoveCommand from "@/schemas/project/commands/variables-remove.command";
import VariablesUpdateCommand from "@/schemas/project/commands/variables-update.command";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/schemas/utils/ids";
import {
	VARIABLE_UPDATABLE_FIELDS,
	VariableUpdatableFields,
	VariableUpdatableFieldsWithId,
} from "@/schemas/variable/variable.schema";

export default class VariablesCommandsFactory {
	static onAddVariable(
		project: Project,
		data: VariableUpdatableFields[],
	): {
		commands: AbstractProjectCommand<any>[];
		variablesToAdd: VariableUpdatableFieldsWithId[];
	} {
		const variablesToAdd = data
			.filter(
				(d) => d.mnemonic.trim() != "" && !project.variables.some((v) => d.mnemonic === v.mnemonic),
			)
			.map((d) => ({ ...d, id: createRandomId() }));
		const commands = [];
		if (variablesToAdd.length > 0) {
			commands.push(new VariablesAddCommand(variablesToAdd));
		}
		return {
			commands,
			variablesToAdd,
		};
	}

	static onUpdateVariable(
		project: Project,
		variableId: string,
		newData: Partial<VariableUpdatableFields>,
	): {
		commands: AbstractProjectCommand<any>[];
	} {
		const variableToUpdate = project.variables.find((v) => v.id === variableId);
		if (!variableToUpdate) {
			return {
				commands: [],
			};
		}
		const oldData = extractFields(Object.keys(newData), variableToUpdate);
		const commands = [];
		if (!deepObjectsComparison(newData, oldData)) {
			commands.push(
				new VariablesUpdateCommand([
					{
						id: variableId,
						newData,
						oldData,
					},
				]),
			);
		}
		return {
			commands,
		};
	}

	static onRemoveVariable(
		project: Project,
		variableIds: string[],
	): {
		commands: AbstractProjectCommand<any>[];
		variablesToRemove: VariableUpdatableFieldsWithId[];
	} {
		const variablesToRemove = project.variables
			.filter((v) => variableIds.includes(v.id))
			.map((v) =>
				extractFields<VariableUpdatableFieldsWithId>([...VARIABLE_UPDATABLE_FIELDS, "id"], v),
			);
		const commands: AbstractProjectCommand<any>[] = [];
		if (variablesToRemove.length > 0) {
			commands.push(new VariablesRemoveCommand(variablesToRemove));
		}
		return {
			commands,
			variablesToRemove,
		};
	}
}
