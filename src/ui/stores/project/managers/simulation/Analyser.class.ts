import ElementDataValidatorFactory from "@/schemas/grafcet/validators/ElementDataValidatorFactory";
import Project from "@/schemas/project/Project.class";

export type AnalysisGrafcetErrors = {
	global: string[];
	elements: Record<string, string[]>;
};

export type AnalysisErrors = {
	grafcets: Record<string, AnalysisGrafcetErrors>;
};
export default class Analyser {
	static getEmptyAnalysisErrors(): AnalysisErrors {
		return {
			grafcets: {},
		};
	}

	analyze(project: Project): {
		errors: AnalysisErrors;
		analysedElementsCount: { total: number; withErrors: number };
	} {
		const analysisErrors: AnalysisErrors = Analyser.getEmptyAnalysisErrors();
		const grafcets = Object.values(project.grafcets);
		const analysedElementsCount = { total: 0, withErrors: 0 };
		grafcets.forEach((grafcet) => {
			const allElements = grafcet.getAllElements();
			analysedElementsCount.total += allElements.length;
			allElements.forEach((element) => {
				const validator = ElementDataValidatorFactory.getValidatorForElementType(element.type);
				const errors = validator.validateData(element.id, element.data, grafcet, {
					projectData: {
						variables: project.variables,
					},
					fullValidation: true,
				});
				if (errors.length > 0) {
					analysedElementsCount.withErrors++;
					//We only keep the first error for each element to avoid overwhelming the user with too many errors at once
					if (!analysisErrors.grafcets[grafcet.id]) {
						analysisErrors.grafcets[grafcet.id] = { global: [], elements: {} };
					}
					if (!analysisErrors.grafcets[grafcet.id].elements[element.id]) {
						analysisErrors.grafcets[grafcet.id].elements[element.id] = [];
					}
					analysisErrors.grafcets[grafcet.id].elements[element.id].push(errors[0]);
				}
			});
		});
		return { errors: analysisErrors, analysedElementsCount };
	}
}
