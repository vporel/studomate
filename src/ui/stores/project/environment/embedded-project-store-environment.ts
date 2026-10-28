import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "next-intl";
import { toast } from "react-toastify";
import { SimulationMode } from "../SimulationMode.enum";
import lazyBrowserHeartbeat from "../managers/simulation/lazy-browser-heartbeat";
import createInProcessScene3dLinkHost from "../managers/3d-scene/in-process-scene3d-link-host";
import type HardwareLinkNotifier from "../managers/hardware-link/hardware-link.notifier";
import type SimulationNotifier from "../managers/simulation/simulation.notifier";
import type { ProjectStoreEnvironment } from "./project-store-environment";

function createEmbeddedSimulationNotifier(locale: Locale): SimulationNotifier {
	return {
		...silentSimulationNotifier,
		analysisCompleted: ({ analysedElements, errors, warnings }) => {
			const t = createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: "toasts",
			});
			const message = t("analysisComplete", {
				elements: analysedElements,
				errors,
				warnings,
				total: errors + warnings,
			});
			if (errors > 0) toast.error(message);
			else if (warnings > 0) toast.warn(message);
			else toast.success(message);
		},
	};
}

const silentSimulationNotifier: SimulationNotifier = {
	analysisCompleted: () => {},
	simulationStarting: () => {},
	simulationCouldNotStart: () => {},
	simulationCrashed: () => {},
	scene3dOpenBlocked: () => {},
};

const silentHardwareNotifier: HardwareLinkNotifier = {
	linked: () => {},
	linkFailed: () => {},
	linkLost: () => {},
	flashFailed: () => {},
	programUploaded: () => {},
	programBlocked: () => {},
	programUploadFailed: () => {},
	programCommandFailed: () => {},
	onlineFailed: () => {},
	onlineLost: () => {},
	boardVariableFailed: () => {},
};

/**
 * Environment of an embedded block: nothing is read from or written to the page (storage, URL,
 * cloud, analytics) and no toast is shown but the result of an analysis and no board can be linked.
 */
export default function createEmbeddedProjectStoreEnvironment({
	locale,
}: {
	locale: Locale;
}): ProjectStoreEnvironment {
	let simulationMode = SimulationMode.CONTINUOUS;
	return {
		getLocale: () => locale,
		capabilities: {
			pdfExport: false,
			crossReference: false,
			ladder: { floatingSystemBlocksPalette: true },
		},
		analytics: { trackEvent: () => {} },
		simulationNotifier: createEmbeddedSimulationNotifier(locale),
		heartbeat: lazyBrowserHeartbeat,
		hardwareNotifier: silentHardwareNotifier,
		createScene3dHost: createInProcessScene3dLinkHost,
		preferences: {
			getSimulationMode: () => simulationMode,
			setSimulationMode: (mode) => {
				simulationMode = mode;
			},
			getAutoOpenHmiSimulationOnStart: () => false,
		},
	};
}
