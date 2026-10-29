import Variable from "@/schemas/variable/variable.schema";
import { LadderElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueCode,
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { Environment } from "@/simulator/interpreter/environment/environment";

/**
 * Contexte de résolution des variables, construit **une fois par ladder** par `LadderAnalyser`
 * et partagé par tous les éléments : la map par mnémonique (types, direction, bloc propriétaire)
 * et l'`Environment` pour l'analyse sémantique des expressions de blocs. Lecture seule pendant
 * l'analyse — aucun analyseur ne doit muter l'`Environment`.
 */
export type LadderVariablesContext = {
	variablesByMnemonic: Map<string, Variable>;
	environment: Environment;
};

export default abstract class LadderElementAnalyser<E extends LadderElement> {
	/**
	 * Rules that apply to the element's own data, independently of the ladder.
	 */
	abstract analyseIsolated(element: E): ProjectAnalyserIssue[];

	/**
	 * Rules that require knowledge of the ladder, the project variables, and — for an element
	 * referencing another program (ex. un bloc `"user-program"`) — the project itself.
	 */
	abstract analyseInContext(
		element: E,
		ladder: Ladder,
		variables: LadderVariablesContext,
		project: Project,
	): ProjectAnalyserIssue[];
}

export function checkHasPredecessor(
	element: LadderElement,
	ladder: Ladder,
	source: ProjectAnalyserIssueSource,
): ProjectAnalyserIssue | null {
	const hasPredecessor = ladder
		.getAllConnections()
		.some(({ connection }) => connection.target.id === element.id);
	return hasPredecessor
		? null
		: new ProjectAnalyserIssue(
				"error",
				"LADDER_ELEMENT_NO_PREDECESSOR",
				source,
			);
}

export type BooleanVariableIssueCodes = {
	noVariable: ProjectAnalyserIssueCode;
	undeclared: ProjectAnalyserIssueCode;
	notBoolean: ProjectAnalyserIssueCode;
};

export function checkBooleanVariable(
	variableName: string,
	variablesByMnemonic: Map<string, Variable>,
	source: ProjectAnalyserIssueSource,
	codes: BooleanVariableIssueCodes,
): ProjectAnalyserIssue | null {
	if (!variableName.trim()) {
		return new ProjectAnalyserIssue("error", codes.noVariable, source);
	}
	const variable = variablesByMnemonic.get(variableName);
	if (!variable) {
		return new ProjectAnalyserIssue("error", codes.undeclared, source, {
			variableName,
		});
	}
	if (variable.type !== "BOOL") {
		return new ProjectAnalyserIssue("error", codes.notBoolean, source, {
			variableName,
		});
	}
	return null;
}
