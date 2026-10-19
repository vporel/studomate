import GrafcetAnalyser from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";

/**
 * The synthetic `X{n}` step-activity variables of every grafcet executed in the project,
 * synthesized for the UI (variable selectors) the same way `ProjectAnalyser` does for analysis:
 * they are never persisted in `project.variables`, and a step is readable from any program.
 */
export function getStepVariables(project: Project): Variable[] {
	const analyser = new GrafcetAnalyser();
	return project
		.getExecutedGrafcets()
		.flatMap((grafcet) => analyser.generateVariables(grafcet, project.dialect));
}
