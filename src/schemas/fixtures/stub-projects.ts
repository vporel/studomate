import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import { createRandomId } from "@/schemas/utils/ids";
import Variable from "@/schemas/variable/variable.schema";
import { getStubGrafcetV1 } from "./stub-grafcets";

/**
 * A stub project with a few variables, used for testing and development purposes.
 * @returns
 */
export function getStubProjectV1(): Project {
	const project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
	project.variables.push(
		new Variable(createRandomId(), "BP_DEMARRER", "logic-input", "BOOL"),
		new Variable(createRandomId(), "GOBELET_EN_POSITION", "logic-input", "BOOL"),
		new Variable(createRandomId(), "NIVEAU_LIQUIDE", "analog-input", "INT"),
		new Variable(createRandomId(), "DISTRIBUER_GOBELET", "logic-output", "BOOL"),
		new Variable(createRandomId(), "REMPLISSAGE", "logic-output", "BOOL"),
	);
	return project;
}

export function getStubProjectV2(): Project {
	const project = getStubProjectV1();
	project.addGrafcet(getStubGrafcetV1());
	return project;
}
