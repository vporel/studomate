import type { Locale } from "@/i18n/config";
import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";
import type { PagesSession } from "@/persistence/pages-session.storage";
import type ProjectRepository from "@/persistence/repositories/project.repository";
import type { authStore, isAnonymousUser } from "@/ui/stores/auth/auth.store";
import type { Scene3dLinkHost } from "../managers/3d-scene/scene3d-link.manager";
import type HardwareLinkNotifier from "../managers/hardware-link/hardware-link.notifier";
import type { RemoteIoDeviceFactory } from "../managers/hardware-link/remote-io-device";
import type SimulationNotifier from "../managers/simulation/simulation.notifier";
import type {
	ProjectBootStatus,
	ProjectStoreGetFunction,
} from "../project.store.types";
import type { SimulationMode } from "../SimulationMode.enum";

/** What the interface around the project can offer. */
export type ProjectCapabilities = {
	/** A program or a table can be exported as a PDF file. */
	pdfExport: boolean;
	/** The cross-reference panel exists to show where a variable is used. */
	crossReference: boolean;
	/** A board can be linked. */
	hardware: boolean;
	/** What the Ladder editor offers. */
	ladder: {
		/**
		 * A button of the toolbar opens a floating box listing the system blocks, to drag onto
		 * the ladder, and the toolbar moves the system block tools into it when it lacks room.
		 */
		floatingSystemBlocksPalette: boolean;
	};
};

export type ProjectStoreAnalytics = {
	trackEvent(eventName: string, eventData?: Record<string, unknown>): void;
};

export type ProjectStorePreferences = {
	getSimulationMode(): SimulationMode;
	setSimulationMode(mode: SimulationMode): void;
	getAutoOpenHmiSimulationOnStart(): boolean;
};

export type ProjectStoreUrl = {
	getActivePageId(): string | null;
	setActivePageId(pageId: string | null): void;
	setProjectId(projectId: string | null): void;
	setShareToken(token: string): void;
	clearShareToken(): void;
};

export type ProjectStorePersistence = {
	repository: ProjectRepository;
	initialBootStatus(): ProjectBootStatus;
	url: ProjectStoreUrl;
	pagesSession: {
		get(projectId: string): PagesSession | null;
		set(projectId: string, session: PagesSession): void;
	};
	drafts: { delete(projectId: string): void };
	auth: {
		store: typeof authStore;
		isAnonymousUser: typeof isAnonymousUser;
	};
};

/**
 * Everything the project store reaches outside of itself. `/app` provides the real
 * implementations; an embedded block provides inert ones and no `persistence`.
 */
export type ProjectStoreEnvironment = {
	/** Language used by code running outside React (analysis messages, simulation errors). */
	getLocale(): Locale;
	capabilities: Omit<ProjectCapabilities, "hardware">;
	analytics: ProjectStoreAnalytics;
	simulationNotifier: SimulationNotifier;
	hardwareNotifier: HardwareLinkNotifier;
	heartbeat?: HeartbeatScheduler;
	createScene3dHost(get: ProjectStoreGetFunction): Scene3dLinkHost;
	preferences: ProjectStorePreferences;
	hardware?: { createDevice: RemoteIoDeviceFactory };
	persistence?: ProjectStorePersistence;
};

/** What `SimulationManager` needs from the environment. */
export type SimulationManagerEnvironment = Pick<
	ProjectStoreEnvironment,
	"getLocale" | "analytics" | "preferences" | "heartbeat" | "simulationNotifier"
>;

export class PersistenceUnavailableError extends Error {
	constructor(feature: string) {
		super(`${feature} is not available: this project store has no persistence`);
		this.name = "PersistenceUnavailableError";
	}
}

export function requirePersistence(
	env: ProjectStoreEnvironment,
	feature: string,
): ProjectStorePersistence {
	if (!env.persistence) throw new PersistenceUnavailableError(feature);
	return env.persistence;
}
