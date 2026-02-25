import { toast } from "react-toastify";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../../project-store-types";
import Analyser from "./Analyser.class";

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private analyser = new Analyser();

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	analyze() {
		const project = this.getStoreState().project;
		if (!project) return;
		const { errors: analysisErrors, analysedElementsCount } = this.analyser.analyze(project);

		const plural = analysedElementsCount.total > 1;
		if (Object.keys(analysisErrors.grafcets).length === 0) {
			toast.success(
				`Analyse terminée : ${analysedElementsCount.total} élément${plural ? "s" : ""} analysé${plural ? "s" : ""}, aucune erreur trouvée`,
			);
		} else {
			toast.error(
				`Analyse terminée : ${analysedElementsCount.total} élément${plural ? "s" : ""} analysé${plural ? "s" : ""}, ${analysedElementsCount.withErrors} avec des erreurs`,
			);
		}

		const analysisOK = Object.keys(analysisErrors.grafcets).length === 0;
		this.setStoreState(() => ({
			analysisOK: analysisOK,
			analysisErrors: analysisErrors,
			analysisErrorsVisible: !analysisOK,
		}));
	}
}
