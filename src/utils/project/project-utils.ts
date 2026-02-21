import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/Project.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import Variable from "@/schemas/variable/Variable.class";

export function getStubProject(): Project {
	const project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
	project.variables.push(
		new Variable(createRandomId(), "Variable 1", "logic-input", "BOOL"),
		new Variable(createRandomId(), "Variable 2", "logic-output", "BOOL"),
		new Variable(createRandomId(), "Variable 3", "analog-input", "INT"),
	);
	return project;
}
