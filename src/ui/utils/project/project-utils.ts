import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/Project.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import Variable from "@/schemas/variable/Variable.class";

export function getStubProject(): Project {
	const project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
	project.variables.push(
		new Variable(createRandomId(), "IN_Var1", "logic-input", "BOOL"),
		new Variable(createRandomId(), "OUT_Var2", "logic-output", "BOOL"),
		new Variable(createRandomId(), "ANALOG_IN_Var3", "analog-input", "INT"),
		new Variable(createRandomId(), "ANALOG_OUT_Var4", "analog-output", "INT"),
		new Variable(createRandomId(), "MEMORY_Var5", "memory", "REAL"),
	);
	return project;
}
