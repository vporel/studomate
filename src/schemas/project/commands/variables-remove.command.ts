import Variable, {
	VariableUpdatableFieldsWithId,
} from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

export default class VariablesRemoveCommand extends AbstractProjectCommand<
	VariableUpdatableFieldsWithId[]
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

	cancel(project: Project): Project {
		project.variables.push(
			...this.payload.map((v) => Variable.fromData(v, project.dialect)),
		);
		return project;
	}
}
