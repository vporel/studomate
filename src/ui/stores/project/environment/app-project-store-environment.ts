import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import {
	getAutoOpenHmiSimulationOnStart,
	resolveUiLocale,
	getStoredScene3dDisplayMode,
	getStoredSimulationMode,
	setStoredScene3dDisplayMode,
	setStoredSimulationMode,
} from "@/persistence/preferences.storage";
import { deleteDraft } from "@/persistence/draft.storage";
import {
	getPagesSession,
	setPagesSession,
} from "@/persistence/pages-session.storage";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import trackEvent from "@/ui/services/analytics";
import notifyFeedbackMilestone from "@/ui/services/feedback-prompt";
import { authStore, isAnonymousUser } from "@/ui/stores/auth/auth.store";
import createBrowserScene3dLinkHost from "../managers/3d-scene/browser-scene3d-link-host";
import createBrowserRemoteIoDevice from "../managers/hardware-link/browser-remote-io-device";
import ToastHardwareLinkNotifier from "../managers/hardware-link/toast.hardware-link.notifier";
import lazyBrowserHeartbeat from "../managers/simulation/lazy-browser-heartbeat";
import ToastSimulationNotifier from "../managers/simulation/toast.simulation.notifier";
import { SimulationMode } from "../simulation-mode.enum";
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

/** Environment of the `/app` page: browser storage, URL, cloud, toasts, analytics. */
export default function createAppProjectStoreEnvironment(
	overrides: Partial<ProjectStoreEnvironment> = {},
): ProjectStoreEnvironment {
	return {
		getLocale: resolveUiLocale,
		capabilities: {
			pdfExport: true,
			crossReference: true,
			programExecutionExclusionToggle: true,
		},
		analytics: { trackEvent },
		feedback: { notify: notifyFeedbackMilestone },
		simulationNotifier: new ToastSimulationNotifier(),
		hardwareNotifier: new ToastHardwareLinkNotifier(),
		heartbeat: lazyBrowserHeartbeat,
		createScene3dHost: createBrowserScene3dLinkHost,
		scene3dDisplay: {
			availableModes: [
				Scene3dDisplayMode.SIDE_PANEL,
				Scene3dDisplayMode.FLOATING_BOX,
				Scene3dDisplayMode.PAGE,
				Scene3dDisplayMode.BROWSER_TAB,
			],
			defaultMode: Scene3dDisplayMode.SIDE_PANEL,
		},
		preferences: {
			getSimulationMode: () =>
				getStoredSimulationMode(Object.values(SimulationMode)) ??
				SimulationMode.CONTINUOUS,
			setSimulationMode: setStoredSimulationMode,
			getAutoOpenHmiSimulationOnStart,
			getScene3dDisplayMode: () =>
				getStoredScene3dDisplayMode(Object.values(Scene3dDisplayMode)),
			setScene3dDisplayMode: setStoredScene3dDisplayMode,
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
