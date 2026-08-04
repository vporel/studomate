/**
 * Ce que la simulation a à annoncer à l'utilisateur.
 *
 * Le manager décrit **ce qui s'est passé** ; l'implémentation décide **comment le dire**.
 * Sans cette séparation, le manager portait directement les appels à react-toastify et la
 * rédaction des messages — impossible à tester, et à réutiliser hors interface.
 */
export type AnalysisSummary = {
	analysedElements: number;
	errors: number;
	warnings: number;
};

export type SimulationFailure =
	| { step: "pre-compilation"; errorsCount: number }
	| { step: "compilation"; errorsCount: number };

export default interface SimulationNotifier {
	analysisCompleted(summary: AnalysisSummary): void;
	simulationStarting(): void;
	simulationCouldNotStart(failure: SimulationFailure): void;
	/** Le cycle automate a échoué : la simulation s'est arrêtée d'elle-même. */
	simulationCrashed(): void;
}
