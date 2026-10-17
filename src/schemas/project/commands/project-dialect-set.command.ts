import { Dialect } from "@/expression-language/dialect.enum";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

/** Changing the dialect translates the keywords of every expression; the reverse translation restores them. */
export default class ProjectDialectSetCommand extends AbstractProjectCommand<{
	newDialect: Dialect;
	oldDialect: Dialect;
}> {
	getType(): string {
		return "project-dialect-set";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.setDialect(this.payload.newDialect);
		return [project, true];
	}

	cancel(project: Project): Project {
		project.setDialect(this.payload.oldDialect);
		return project;
	}
}
