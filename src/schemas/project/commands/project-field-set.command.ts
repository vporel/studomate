import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

/** Project fields that are replaced as a whole, with no side effect on the rest of the project. */
export type ProjectSettableField = keyof Pick<
	Project,
	"name" | "author" | "exercise" | "scene3d" | "hardwareTarget"
>;

export default class ProjectFieldSetCommand<
	K extends ProjectSettableField,
> extends AbstractProjectCommand<{
	field: K;
	newValue: Project[K];
	oldValue: Project[K];
}> {
	getType(): string {
		return `project-${this.payload.field}-set`;
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project[this.payload.field] = this.payload.newValue;
		return [project, true];
	}

	cancel(project: Project): Project {
		project[this.payload.field] = this.payload.oldValue;
		return project;
	}
}
