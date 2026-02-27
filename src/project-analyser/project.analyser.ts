import Project from "../schemas/project/project.schema";
import Variable from "../schemas/variable/variable.schema";
import GrafcetAnalyser from "./analysers/grafcet/grafcet.analyser";
import ProjectAnalyserIssue from "./project.analyser.issue";

export type ProjectAnalysisResult = {
	totalAnalysedElements: number;
	issues: ProjectAnalyserIssue[];
	/**
	 * Synthetic BOOL memory variables generated for each step with a valid number.
	 * Mnemonic pattern: X{stepNumber} — available for use in transition/action expressions.
	 */
	stepsVariables: Variable[];
};

export default class ProjectAnalyser {
	/**
	 * Analyses an entire project for structural and business rule violations.
	 * Does not evaluate or compile expressions — use ProjectCompiler for that.
	 *
	 * Returns an AnalysisResult aggregating all issues found across all grafcets,
	 * along with the synthetic step variables generated for the whole project.
	 * Analysis never throws: all problems are captured as issues.
	 */
	static analyse(project: Project): ProjectAnalysisResult {
		const issues: ProjectAnalyserIssue[] = [];
		const stepsVariables: Variable[] = [];

		let totalAnalysedElements = 0;

		for (const grafcet of Object.values(project.grafcets)) {
			const result = GrafcetAnalyser.analyse(grafcet, project);
			issues.push(...result.issues);
			stepsVariables.push(...result.stepsVariables);
			totalAnalysedElements += grafcet.getAllElements().length;
		}

		return {
			totalAnalysedElements,
			issues,
			stepsVariables,
		};
	}
}
