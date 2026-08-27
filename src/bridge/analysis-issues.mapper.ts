import type ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

/**
 * Problèmes d'analyse regroupés par programme (GRAFCET ou Ladder), prêts à être affichés.
 */
export type AnalysisProgramIssues = {
	overall: string[];
	elements: Record<string, string[]>;
};

export type AnalysisIssues = {
	project: string[];
	grafcets: Record<string, AnalysisProgramIssues>;
	ladders: Record<string, AnalysisProgramIssues>;
};

export function emptyAnalysisIssues(): AnalysisIssues {
	return {
		project: [],
		grafcets: {},
		ladders: {},
	};
}

export default class AnalysisIssuesMapper {
	static analyserToApp(
		projectAnalyserIssues: ProjectAnalyserIssue[],
	): AnalysisIssues {
		const result: AnalysisIssues = emptyAnalysisIssues();
		result.project = projectAnalyserIssues
			.filter((issue) => issue.source.sourceType === "project")
			.map((issue) => issue.message);

		projectAnalyserIssues.forEach((issue) => {
			const { sourceType, sourceId, parentId } = issue.source;
			if (sourceType === "project") return;

			// "grafcet"/"ladder" sont les programmes eux-mêmes (sourceId = leur id, un problème
			// global) ; tout le reste ("grafcet-step", "ladder-contact"...) est un élément dont
			// `parentId` porte l'id du programme — jamais l'inverse, un id de ladder ne doit
			// jamais atterrir dans le seau des grafcets (et réciproquement), sans quoi la
			// résolution du nom du programme échoue côté UI.
			const isProgramItself =
				sourceType === "grafcet" || sourceType === "ladder";
			const programId = isProgramItself ? sourceId : parentId;
			if (!programId) return;
			const bucket =
				sourceType === "ladder" || sourceType.startsWith("ladder-")
					? result.ladders
					: result.grafcets;

			if (!bucket[programId]) bucket[programId] = { overall: [], elements: {} };
			if (isProgramItself) {
				bucket[programId].overall.push(issue.message);
			} else {
				if (!bucket[programId].elements[sourceId])
					bucket[programId].elements[sourceId] = [];
				bucket[programId].elements[sourceId].push(issue.message);
			}
		});

		return result;
	}
}
