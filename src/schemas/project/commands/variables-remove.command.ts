import Variable, {
	VariableUpdatableFieldsWithId,
} from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

/** A removed variable, with its position in `project.variables` before the removal. */
export type VariableRemoval = VariableUpdatableFieldsWithId & {
	index?: number;
};

export default class VariablesRemoveCommand extends AbstractProjectCommand<
	VariableRemoval[]
> {
	getType(): string {
		return "variables-remove";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.variables = project.variables.filter(
			(v) => !this.payload.some((p) => p.id === v.id),
		);
		return [project, true];
	}

	/**
	 * Puts every variable back at its position. Inserting by increasing original position
	 * rebuilds the list exactly, even for variables that were not next to each other; one without
	 * a position goes to the end.
	 */
	cancel(project: Project): Project {
		const byPosition = [...this.payload].sort(
			(a, b) => (a.index ?? Infinity) - (b.index ?? Infinity),
		);
		for (const { index, ...fields } of byPosition) {
			const variable = Variable.fromData(fields, project.dialect);
			project.variables.splice(
				Math.min(index ?? project.variables.length, project.variables.length),
				0,
				variable,
			);
		}
		return project;
	}
}
