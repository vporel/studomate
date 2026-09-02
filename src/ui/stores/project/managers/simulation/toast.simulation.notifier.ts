import { getT } from "@/ui/i18n/translateGlobal";
import { toast } from "react-toastify";
import SimulationNotifier, {
	AnalysisSummary,
	SimulationFailure,
} from "./simulation.notifier";

/**
 * Notifications sous forme de toasts. Seul endroit où sont écrits les messages destinés à
 * l'utilisateur pour la simulation — le texte vit dans `src/i18n/messages/{fr,en}/toasts.json`.
 */
export default class ToastSimulationNotifier implements SimulationNotifier {
	analysisCompleted({
		analysedElements,
		errors,
		warnings,
	}: AnalysisSummary): void {
		const message = getT("toasts")("analysisComplete", {
			elements: analysedElements,
			errors,
			warnings,
			total: errors + warnings,
		});

		if (errors > 0) toast.error(message);
		else if (warnings > 0) toast.warn(message);
		else toast.success(message);
	}

	simulationStarting(): void {
		toast.success(getT("toasts")("simulationStarting"));
	}

	simulationCouldNotStart({ step, errorsCount }: SimulationFailure): void {
		toast.error(
			getT("toasts")("simulationCouldNotStart", {
				count: errorsCount,
				step: step === "pre-compilation" ? "preCompilation" : "compilation",
			}),
		);
	}

	simulationCrashed(): void {
		toast.error(getT("toasts")("simulationCrashed"));
	}
}
