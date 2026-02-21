import { VariableUpdatableFields } from "@/schemas/variable/Variable.class";
import Project from "../Project.class";
import AbstractProjectCommand from "./AbstractProjectCommand.class";

export default class VariablesUpdateCommand extends AbstractProjectCommand<
	{
		id: string;
		newData: Partial<VariableUpdatableFields>;
		previousData: Partial<VariableUpdatableFields>;
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
			return v.update(payload.previousData);
		});
		return project;
	}
}
