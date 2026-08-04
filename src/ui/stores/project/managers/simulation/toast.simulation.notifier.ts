import { toast } from "react-toastify";
import SimulationNotifier, { AnalysisSummary, SimulationFailure } from "./simulation.notifier";

/** Accord en nombre, pour éviter « 1 erreurs ». */
function plural(count: number, singular: string, plural_: string = singular + "s"): string {
	return count > 1 ? plural_ : singular;
}

/**
 * Notifications sous forme de toasts. Seul endroit où sont écrits les messages destinés à
 * l'utilisateur pour la simulation.
 */
export default class ToastSimulationNotifier implements SimulationNotifier {
	analysisCompleted({ analysedElements, errors, warnings }: AnalysisSummary): void {
		const message =
			`Analyse terminée : ${analysedElements} ${plural(analysedElements, "élément")} ` +
			`${plural(analysedElements, "analysé")}, ` +
			`${errors === 0 ? "aucune" : errors} ${plural(errors, "erreur")} et ` +
			`${warnings === 0 ? "aucun" : warnings} ${plural(warnings, "avertissement")} ` +
			`${plural(errors + warnings, "trouvé")}.`;

		if (errors > 0) toast.error(message);
		else if (warnings > 0) toast.warn(message);
		else toast.success(message);
	}

	simulationStarting(): void {
		toast.success("Compilation terminée, lancement de la simulation...");
	}

	simulationCouldNotStart({ step, errorsCount }: SimulationFailure): void {
		const étape = step === "pre-compilation" ? "la pré-compilation" : "la compilation";
		toast.error(
			`Impossible de lancer la simulation : ${errorsCount} ${plural(errorsCount, "erreur")} lors de ${étape}.`,
		);
	}

	simulationCrashed(): void {
		toast.error("Arrêt de la simulation. Erreur lors de l'exécution du cycle automate.");
	}
}
