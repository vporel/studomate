import Variable, { VariableUpdatableFieldsWithId } from "@/schemas/variable/Variable.class";
import Project from "../Project.class";
import AbstractProjectCommand from "./AbstractProjectCommand.class";

export default class VariablesRemoveCommand extends AbstractProjectCommand<VariableUpdatableFieldsWithId[]> {
	getType(): string {
		return "variables-remove";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.variables = project.variables.filter((v) => !this.payload.some((p) => p.id === v.id));
		return [project, true];
	}

	cancel(project: Project): Project {
		project.variables.push(
			...this.payload.map((v) => {
				const variable = new Variable(v.id, v.mnemonic, v.zone, v.type);
				if (v.address) variable.address = v.address;
				if (v.comment) variable.comment = v.comment;
				return variable;
			}),
		);
		return project;
	}
}
