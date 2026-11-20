import {
	isShareable,
	isStorageLocationAware,
} from "@/persistence/repositories/project.repository";
import {
	requirePersistence,
	type ProjectStoreEnvironment,
} from "../environment/project-store-environment";
import { toast } from "react-toastify";
import { getT } from "@/ui/i18n/translateGlobal";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store.types";

/** Where the user started sharing from, for the usage statistics. */
export type ShareSource = "menu" | "title-bar" | "properties";

/**
 * Partage d'un projet par token d'URL : création/révocation du token, passage préalable dans le
 * cloud, reprise automatique après connexion. Actions ponctuelles (menu Projet, modales) — hors
 * de l'objet d'état du store. Les champs réactifs associés (`shareToken`, `isSharedProject`,
 * `pendingShareAfterAuth`) restent dans l'état : l'UI s'y abonne.
 */
export default class ProjectSharingManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(
		set: ProjectStoreSetFunction,
		get: ProjectStoreGetFunction,
		private readonly env: ProjectStoreEnvironment,
	) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	/**
	 * `source` is given when the user starts sharing: the resumptions after sign-in or after the
	 * move to the cloud call it without one and are not counted as new attempts.
	 */
	async shareProject(source?: ShareSource): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return;
		const { auth } = requirePersistence(this.env, "Sharing");
		const authStore = auth.store;
		const repo = get().projectRepository;
		if (!isShareable(repo)) return;

		if (source) {
			this.env.analytics.trackEvent("share-started", {
				source,
				signedIn: authStore.getState().user !== null,
				inCloud:
					isStorageLocationAware(repo) &&
					repo.locationOf(project.id) === "cloud",
			});
		}

		// Non connecté : on ouvre la modale de connexion et on reprend le partage dès
		// qu'une session s'ouvre. Si la modale se ferme sans connexion, on abandonne.
		if (!authStore.getState().user) {
			if (get().pendingShareAfterAuth) return;
			set({ pendingShareAfterAuth: true });
			const unsubscribe = authStore.subscribe((authState) => {
				if (authState.user) {
					unsubscribe();
					set({ pendingShareAfterAuth: false });
					void this.shareProject();
				} else if (!authState.ui.authModalVisible) {
					unsubscribe();
					set({ pendingShareAfterAuth: false });
				}
			});
			authStore
				.getState()
				.setAuthModalVisible(true, getT("toasts")("shareLoginPrompt"));
			return;
		}

		// Connecté mais projet stocké en local : il doit d'abord passer dans le cloud.
		if (
			isStorageLocationAware(repo) &&
			repo.locationOf(project.id) === "local"
		) {
			set((state) => ({
				ui: { ...state.ui, shareRequiresCloudModalVisible: true },
			}));
			return;
		}

		// Vérifie si un token existe déjà
		const existing = await repo.getShareToken(project.id);
		if (existing) {
			set(() => ({ shareToken: existing }));
			set((state) => ({ ui: { ...state.ui, shareModalVisible: true } }));
			return;
		}
		const result = await repo.createShareToken(project.id);
		if (!result.ok) {
			toast.error(getT("toasts")("shareLinkFailed"));
			return;
		}
		this.env.analytics.trackEvent("share-link-created", {
			anonymous: auth.isAnonymousUser(authStore.getState().user),
		});
		set(() => ({ shareToken: result.token }));
		set((state) => ({ ui: { ...state.ui, shareModalVisible: true } }));
	}

	async moveToCloudAndShare(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return;
		const repo = get().projectRepository;
		if (!isStorageLocationAware(repo)) return;
		const result = await repo.moveToCloud(project);
		if (!result.ok) {
			toast.error(
				result.reason === "conflict"
					? getT("toasts")("moveToCloudConflict")
					: getT("toasts")("moveToCloudFailed"),
			);
			return;
		}
		set((state) => ({
			ui: { ...state.ui, shareRequiresCloudModalVisible: false },
		}));
		await this.shareProject();
	}

	async unshareProject(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return;
		const repo = get().projectRepository;
		if (!isShareable(repo)) return;
		const result = await repo.deleteShareToken(project.id);
		if (!result.ok) {
			toast.error(getT("toasts")("shareRevokeFailed"));
			return;
		}
		set(() => ({ shareToken: null }));
	}
}
