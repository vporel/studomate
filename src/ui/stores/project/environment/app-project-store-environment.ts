import {
	getAutoOpenHmiSimulationOnStart,
	resolveUiLocale,
} from "@/persistence/preferences.storage";
import { deleteDraft } from "@/persistence/draft.storage";
import {
	getPagesSession,
	setPagesSession,
} from "@/persistence/pages-session.storage";
import { readString, writeString } from "@/persistence/safe-local-storage";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import trackEvent from "@/ui/services/analytics";
import notifyFeedbackMilestone from "@/ui/services/feedback-prompt";
import { authStore, isAnonymousUser } from "@/ui/stores/auth/auth.store";
import createBrowserScene3dLinkHost from "../managers/3d-scene/browser-scene3d-link-host";
import createBrowserRemoteIoDevice from "../managers/hardware-link/browser-remote-io-device";
import ToastHardwareLinkNotifier from "../managers/hardware-link/toast.hardware-link.notifier";
import lazyBrowserHeartbeat from "../managers/simulation/lazy-browser-heartbeat";
import ToastSimulationNotifier from "../managers/simulation/toast.simulation.notifier";
import { SimulationMode } from "../SimulationMode.enum";
import { getActivePageIdFromUrl, setActivePageIdInUrl } from "../url/pages-url";
import {
	clearShareTokenFromUrl,
	getHandoffIdFromUrl,
	getProjectIdFromUrl,
	getShareTokenFromUrl,
	getTemplateIdFromUrl,
	setProjectIdInUrl,
	setShareTokenInUrl,
} from "../url/project-url";
import type { ProjectStoreEnvironment } from "./project-store-environment";

const SIMULATION_MODE_STORAGE_KEY = "studomate:simulationMode";

export function getPersistedSimulationMode(): SimulationMode {
	const stored = readString(SIMULATION_MODE_STORAGE_KEY);
	if (stored === SimulationMode.STEP_BY_STEP)
		return SimulationMode.STEP_BY_STEP;
	return SimulationMode.CONTINUOUS;
}

/** Environment of the `/app` page: browser storage, URL, cloud, toasts, analytics. */
export default function createAppProjectStoreEnvironment(
	overrides: Partial<ProjectStoreEnvironment> = {},
): ProjectStoreEnvironment {
	return {
		getLocale: resolveUiLocale,
		capabilities: {
			pdfExport: true,
			crossReference: true,
			ladder: { floatingSystemBlocksPalette: false },
		},
		analytics: { trackEvent },
		feedback: { notify: notifyFeedbackMilestone },
		simulationNotifier: new ToastSimulationNotifier(),
		hardwareNotifier: new ToastHardwareLinkNotifier(),
		heartbeat: lazyBrowserHeartbeat,
		createScene3dHost: createBrowserScene3dLinkHost,
		preferences: {
			getSimulationMode: getPersistedSimulationMode,
			setSimulationMode: (mode) =>
				writeString(SIMULATION_MODE_STORAGE_KEY, mode),
			getAutoOpenHmiSimulationOnStart,
		},
		hardware: { createDevice: createBrowserRemoteIoDevice },
		persistence: {
			repository: new HybridProjectRepository(),
			initialBootStatus: () =>
				getProjectIdFromUrl() ||
				getShareTokenFromUrl() ||
				getTemplateIdFromUrl() ||
				getHandoffIdFromUrl()
					? "restoring"
					: "idle",
			url: {
				getActivePageId: getActivePageIdFromUrl,
				setActivePageId: setActivePageIdInUrl,
				setProjectId: setProjectIdInUrl,
				setShareToken: setShareTokenInUrl,
				clearShareToken: clearShareTokenFromUrl,
			},
			pagesSession: { get: getPagesSession, set: setPagesSession },
			drafts: { delete: deleteDraft },
			auth: { store: authStore, isAnonymousUser },
		},
		...overrides,
	};
}
