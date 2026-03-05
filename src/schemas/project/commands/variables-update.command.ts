import { VariableUpdatableFields } from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

export default class VariablesUpdateCommand extends AbstractProjectCommand<
	{
		id: string;
		newData: Partial<VariableUpdatableFields>;
		oldData: Partial<VariableUpdatableFields>;
	}[]
> {
	getType(): string {
		return "variables-update";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.variables = project.variables.map((v) => {
			const payload = this.payload.find((p) => p.id === v.id);
			if (!payload) return v;
			return v.update(payload.newData);
		});
		return [project, true];
	}

	cancel(project: Project): Project {
		project.variables = project.variables.map((v) => {
			const payload = this.payload.find((p) => p.id === v.id);
			if (!payload) return v;
			return v.update(payload.oldData);
		});
		return project;
	}
}
