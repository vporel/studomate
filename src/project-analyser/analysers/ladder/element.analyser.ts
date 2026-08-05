import Variable from "@/schemas/variable/variable.schema";
import { LadderElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

export default abstract class LadderElementAnalyser<E extends LadderElement> {
	/**
	 * Rules that apply to the element's own data, independently of the ladder.
	 */
	abstract analyseIsolated(element: E): ProjectAnalyserIssue[];

	/**
	 * Rules that require knowledge of the ladder and the project variables.
	 */
	abstract analyseInContext(
		element: E,
		ladder: Ladder,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[];
}
