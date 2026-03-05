import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import {
	AnalysisIssues,
	emptyAnalysisIssues,
} from "@/ui/stores/project/managers/simulation/simulation.manager";

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
