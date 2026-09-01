import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import { isShareable } from "@/persistence/repositories/project.repository";
import { authStore } from "@/ui/stores/auth/auth.store";
import { toast } from "react-toastify";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store.types";

/**
 * Partage d'un projet par token d'URL : création/révocation du token, passage préalable dans le
 * cloud, reprise automatique après connexion. Actions ponctuelles (menu Projet, modales) — hors
 * de l'objet d'état du store. Les champs réactifs associés (`shareToken`, `isSharedProject`,
 * `pendingShareAfterAuth`) restent dans l'état : l'UI s'y abonne.
 */
export default class ProjectSharingManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	async shareProject(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return;
		const repo = get().projectRepository;
		if (!isShareable(repo)) return;

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
				.setAuthModalVisible(true, "Connectez-vous pour partager ce projet.");
			return;
		}

		// Connecté mais projet stocké en local : il doit d'abord passer dans le cloud.
		if (
			repo instanceof HybridProjectRepository &&
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
			toast.error(result.message);
			return;
		}
		set(() => ({ shareToken: result.token }));
		set((state) => ({ ui: { ...state.ui, shareModalVisible: true } }));
	}

	async moveToCloudAndShare(): Promise<void> {
		const set = this.setStoreState;
		const get = this.getStoreState;
		const project = get().project;
		if (!project) return;
		const repo = get().projectRepository;
		if (!(repo instanceof HybridProjectRepository)) return;
		const result = await repo.moveToCloud(project);
		if (!result.ok) {
			toast.error(
				result.reason === "conflict"
					? "Un projet cloud avec cet identifiant existe déjà, probablement envoyé depuis un autre appareil."
					: "Le projet n'a pas pu être envoyé dans le cloud. Vérifiez votre connexion.",
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
			toast.error("Impossible de révoquer le partage.");
			return;
		}
		set(() => ({ shareToken: null }));
	}
}
