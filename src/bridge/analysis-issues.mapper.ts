import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

/**
 * Problèmes d'analyse regroupés par grafcet, prêts à être affichés.
 *
 * Ce type est la **sortie de ce mapper**, sa place est donc ici. Il était déclaré dans un
 * manager de store, ce qui obligeait le bridge à importer depuis la couche UI — soit
 * exactement l'inverse du sens attendu.
 */
export type AnalysisGrafcetIssues = {
	overall: string[];
	elements: Record<string, string[]>;
};

export type AnalysisIssues = {
	project: string[];
	grafcets: Record<string, AnalysisGrafcetIssues>;
};

export function emptyAnalysisIssues(): AnalysisIssues {
	return {
		project: [],
		grafcets: {},
	};
}

export default class AnalysisIssuesMapper {
	static analyserToApp(projectAnalyserIssues: ProjectAnalyserIssue[]): AnalysisIssues {
		const result: AnalysisIssues = emptyAnalysisIssues();
		result.project = projectAnalyserIssues
			.filter((issue) => issue.source.sourceType === "project")
			.map((issue) => issue.message);
		projectAnalyserIssues.forEach((issue) => {
			const grafcetId =
				issue.source.sourceType === "grafcet" ? issue.source.sourceId : issue.source.parentId;
			const elementId = issue.source.sourceType !== "grafcet" ? issue.source.sourceId : null;
			if (grafcetId) {
				if (!result.grafcets[grafcetId]) {
					result.grafcets[grafcetId] = { overall: [], elements: {} };
				}
				if (elementId) {
					if (!result.grafcets[grafcetId].elements[elementId]) {
						result.grafcets[grafcetId].elements[elementId] = [];
					}
					result.grafcets[grafcetId].elements[elementId].push(issue.message);
				} else {
					result.grafcets[grafcetId].overall.push(issue.message);
				}
			}
		});
		return result;
	}
}
