import Variable, { VariableUpdatableFieldsWithId } from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

export default class VariablesAddCommand extends AbstractProjectCommand<VariableUpdatableFieldsWithId[]> {
	getType(): string {
		return "variables-add";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.variables.push(
			...this.payload.map((v) => {
				const variable = new Variable(v.id, v.mnemonic, v.zone, v.type);
				if (v.address) variable.address = v.address;
				if (v.comment) variable.comment = v.comment;
				return variable;
			}),
		);
		return [project, true];
	}

	cancel(project: Project): Project {
		project.variables = project.variables.filter((v) => !this.payload.some((p) => p.id === v.id));
		return project;
	}
}
