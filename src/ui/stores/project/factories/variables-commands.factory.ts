import { deepObjectsComparison, extractFields } from "@/lib/object";
import AbstractProjectCommand from "@/schemas/project/commands/abstract-project.command";
import VariablesAddCommand from "@/schemas/project/commands/variables-add.command";
import VariablesRemoveCommand from "@/schemas/project/commands/variables-remove.command";
import VariablesUpdateCommand from "@/schemas/project/commands/variables-update.command";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { validateBehavior } from "@/schemas/variable/variable.validator";
import Variable, {
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
				(d) =>
					d.mnemonic.trim() != "" &&
					!project.variables.some((v) => d.mnemonic === v.mnemonic),
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
		newData = VariablesCommandsFactory.withInvalidatedBehaviorReset(
			variableToUpdate,
			newData,
		);
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

	/**
	 * A zone or type change can make the current behavior invalid (push-button moved to memory,
	 * slider bounds outside the new type's range...): it is then reset to `null` within the same
	 * command, so that undo restores it.
	 */
	private static withInvalidatedBehaviorReset(
		variable: Variable,
		newData: Partial<VariableUpdatableFields>,
	): Partial<VariableUpdatableFields> {
		if ("behavior" in newData || !variable.behavior) return newData;
		const zone = newData.zone ?? variable.zone;
		const type = newData.type ?? variable.type;
		if (validateBehavior(zone, type, variable.behavior).length === 0)
			return newData;
		return { ...newData, behavior: null };
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
				extractFields<VariableUpdatableFieldsWithId>(
					[...VARIABLE_UPDATABLE_FIELDS, "id"],
					v,
				),
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
