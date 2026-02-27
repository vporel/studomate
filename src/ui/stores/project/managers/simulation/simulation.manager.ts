import ProjectAnalyser from "@/project-analyser/project.analyser";
import { toast } from "react-toastify";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../../project.store";

export type AnalysisGrafcetIssues = {
	overall: string[];
	elements: Record<string, string[]>;
};

export type AnalysisIssues = {
	grafcets: Record<string, AnalysisGrafcetIssues>;
};

export function emptyAnalysisIssues(): AnalysisIssues {
	return {
		grafcets: {},
	};
}

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	analyze() {
		const project = this.getStoreState().project;
		if (!project) return;
		const result = ProjectAnalyser.analyse(project);
		const errors = result.issues.filter((i) => i.severity === "error");
		const warnings = result.issues.filter((i) => i.severity === "warning");
		const analysisErrors: AnalysisIssues = emptyAnalysisIssues();
		const analysisWarnings: AnalysisIssues = emptyAnalysisIssues();

		result.issues.forEach((issue) => {
			const grafcetId =
				issue.source.sourceType === "grafcet" ? issue.source.sourceId : issue.source.parentId;
			const elementId = issue.source.sourceType !== "grafcet" ? issue.source.sourceId : null;
			if (issue.severity === "error") {
				if (grafcetId) {
					if (!analysisErrors.grafcets[grafcetId]) {
						analysisErrors.grafcets[grafcetId] = { overall: [], elements: {} };
					}
					if (elementId) {
						if (!analysisErrors.grafcets[grafcetId].elements[elementId]) {
							analysisErrors.grafcets[grafcetId].elements[elementId] = [];
						}
						analysisErrors.grafcets[grafcetId].elements[elementId].push(issue.message);
					} else {
						analysisErrors.grafcets[grafcetId].overall.push(issue.message);
					}
				}
			} else if (issue.severity === "warning") {
				if (grafcetId) {
					if (!analysisWarnings.grafcets[grafcetId]) {
						analysisWarnings.grafcets[grafcetId] = { overall: [], elements: {} };
					}
					if (elementId) {
						if (!analysisWarnings.grafcets[grafcetId].elements[elementId]) {
							analysisWarnings.grafcets[grafcetId].elements[elementId] = [];
						}
						analysisWarnings.grafcets[grafcetId].elements[elementId].push(issue.message);
					} else {
						analysisWarnings.grafcets[grafcetId].overall.push(issue.message);
					}
				}
			}
		});

		const pluralTotal = result.totalAnalysedElements > 1;
		const pluralErrors = errors.length > 1;
		const pluralWarnings = warnings.length > 1;
		const toastFunction =
			errors.length > 0 ? toast.error : warnings.length > 0 ? toast.warn : toast.success;

		toastFunction(
			`Analyse terminée : ${result.totalAnalysedElements} élément${pluralTotal ? "s" : ""} analysé${pluralTotal ? "s" : ""}, 
				${errors.length === 0 ? "aucune" : errors.length} erreur${pluralErrors ? "s" : ""} et 
				${warnings.length === 0 ? "aucun" : warnings.length} avertissement${pluralWarnings ? "s" : ""} trouvé${errors.length + warnings.length > 1 ? "s" : ""}.`,
		);

		this.setStoreState(() => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors,
			analysisWarnings,
			analysisResultVisible: errors.length >= 0,
		}));
	}
}
