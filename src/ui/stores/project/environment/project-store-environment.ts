import type { FeedbackMilestone } from "@/feedback/feedback-prompt";
import type { Locale } from "@/i18n/config";
import type { Scene3dDisplayMode } from "../scene3d-display-mode.enum";
import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";
import type { Draft, DraftSaveResult } from "@/persistence/draft.storage";
import type { PagesSession } from "@/persistence/pages-session.storage";
import type Project from "@/schemas/project/project.schema";
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
import type { SimulationMode } from "../simulation-mode.enum";

/** What the interface around the project can offer. */
export type ProjectCapabilities = {
	/** A program or a table can be exported (PDF, image, CSV). */
	export: boolean;
	/** The cross-reference panel exists to show where a variable is used. */
	crossReference: boolean;
	/** A board can be linked. */
	hardware: boolean;
	/**
	 * The user can exclude a program from execution or include it again. Programs already excluded
	 * stay excluded and are shown as such either way.
	 */
	programExecutionExclusionToggle: boolean;
};

/** Looks up a message in the language of the environment, `key` being relative to `namespace`. */
export type ProjectStoreTranslator = (
	key: string,
	values?: Record<string, string | number>,
) => string;

/** What the user is told outside of the interface's own panels. */
export type ProjectStoreNotifications = {
	error(message: string): void;
};

export type ProjectStoreAnalytics = {
	trackEvent(eventName: string, eventData?: Record<string, unknown>): void;
};

/** Lets the interface ask for an opinion after something the user achieved. */
export type ProjectStoreFeedback = {
	notify(milestone: FeedbackMilestone): void;
};

export type ProjectStorePreferences = {
	getSimulationMode(): SimulationMode;
	setSimulationMode(mode: SimulationMode): void;
	getAutoOpenHmiSimulationOnStart(): boolean;
	/** `null` until the user chose a mode. */
	getScene3dDisplayMode(): Scene3dDisplayMode | null;
	setScene3dDisplayMode(mode: Scene3dDisplayMode): void;
};

/** Where the 3D scene can be shown, and where it is when the user has not chosen. */
export type ProjectStoreScene3dDisplay = {
	availableModes: readonly Scene3dDisplayMode[];
	defaultMode: Scene3dDisplayMode;
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
	drafts: {
		get(projectId: string): Draft | null;
		save(projectId: string, projectName: string, data: string): DraftSaveResult;
		delete(projectId: string): void;
		/** `null` when the stored data does not describe a readable project. */
		parse(data: string): Project | null;
	};
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
	/** Translator for the code running outside React, in the language of `getLocale()`. */
	translate(namespace: string): ProjectStoreTranslator;
	notifications: ProjectStoreNotifications;
	capabilities: Omit<ProjectCapabilities, "hardware">;
	analytics: ProjectStoreAnalytics;
	feedback?: ProjectStoreFeedback;
	simulationNotifier: SimulationNotifier;
	hardwareNotifier: HardwareLinkNotifier;
	heartbeat?: HeartbeatScheduler;
	createScene3dHost(get: ProjectStoreGetFunction): Scene3dLinkHost;
	scene3dDisplay: ProjectStoreScene3dDisplay;
	preferences: ProjectStorePreferences;
	hardware?: { createDevice: RemoteIoDeviceFactory };
	persistence?: ProjectStorePersistence;
};

/** What `SimulationManager` needs from the environment. */
export type SimulationManagerEnvironment = Pick<
	ProjectStoreEnvironment,
	| "getLocale"
	| "analytics"
	| "feedback"
	| "preferences"
	| "heartbeat"
	| "simulationNotifier"
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
