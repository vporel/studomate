import Project from "@/schemas/project/project.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Variable from "../../../schemas/variable/variable.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyserFactory from "./element-analyser.factory";

export type GrafcetAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	stepsVariables: Variable[];
};

export default class GrafcetAnalyser {
	/**
	 * Runs all isolated and contextual rules on every element of the grafcet.
	 */
	static analyse(grafcet: Grafcet, project: Project): GrafcetAnalysisResult {
		const allElements = [...grafcet.steps, ...grafcet.transitions, ...grafcet.actions];

		const stepsVariables = this.buildstepsVariables(grafcet, grafcet.id);
		const allVariables = [...project.variables, ...stepsVariables];
		const elementsIssues = allElements
			.flatMap((element) => {
				const analyser = ElementAnalyserFactory.getAnalyserForType(element.type);
				return [
					...analyser.analyseIsolated(element, { allowEmptyContent: false }),
					...analyser.analyseInContext(element, grafcet, allVariables),
				];
			})
			.map((issue) => {
				// Attach parentId
				issue.source.parentId = grafcet.id;
				return issue;
			});
		const issues = [...this.checkInitialStep(grafcet, grafcet.id), ...elementsIssues];

		return {
			issues,
			stepsVariables,
		};
	}

	/**
	 * Generates one synthetic BOOL memory variable per step with a valid, unique number.
	 * Mnemonic: X{stepNumber} — deduplicated by mnemonic so duplicate-number errors
	 * don't produce duplicate variables.
	 */
	private static buildstepsVariables(grafcet: Grafcet, grafcetId: string): Variable[] {
		const seen = new Set<number>();
		const variables: Variable[] = [];

		for (const step of grafcet.steps) {
			const n = step.data.number;
			if (n === null || n === undefined || n === "" || !Number.isInteger(n) || (n as number) < 0)
				continue;
			if (seen.has(n as number)) continue;
			seen.add(n as number);
			variables.push(new Variable(`grafcet-${grafcetId}-step-${n}`, `X${n}`, "memory", "BOOL"));
		}

		return variables;
	}

	/**
	 * Grafcet-level rule: must contain at least one initial step.
	 */
	private static checkInitialStep(grafcet: Grafcet, grafcetId: string): ProjectAnalyserIssue[] {
		const hasInitialStep = grafcet.steps.some((s) => s.data.initial === true);
		if (!hasInitialStep) {
			return [
				new ProjectAnalyserIssue(
					"error",
					{ sourceType: "grafcet", sourceId: grafcetId },
					"Le grafcet ne contient aucune étape initiale.",
				),
			];
		}
		return [];
	}
}
