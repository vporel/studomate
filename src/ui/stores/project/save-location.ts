import Project from "@/schemas/project/project.schema";
import { StorageLocation } from "@/persistence/repositories/project.repository";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import { authStore } from "@/ui/stores/auth/auth.store";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "./project.store.types";

function openSaveLocationModal(
	set: ProjectStoreSetFunction,
): Promise<StorageLocation | null> {
	return new Promise((resolve) => {
		set((state) => ({
			ui: {
				...state.ui,
				saveLocationModalVisible: true,
				onSaveLocationChosen: (location) => {
					set((state) => ({
						ui: {
							...state.ui,
							saveLocationModalVisible: false,
							onSaveLocationChosen: null,
						},
					}));
					resolve(location);
				},
			},
		}));
	});
}

/**
 * Résout le lieu de stockage à passer à `save` pour `project` — `undefined` si ce projet a
 * déjà un lieu (rien à décider, `save` garde son comportement par défaut), `"cancelled"` si
 * l'utilisateur a fermé la modale de choix sans trancher.
 *
 * Un id absent de l'index cloud n'est pas forcément neuf (il peut déjà exister en local) :
 * seul un id absent des deux repositories l'est réellement, d'où la lecture locale avant de
 * proposer un choix.
 */
export default async function resolveSaveLocationIfNeeded(
	project: Project,
	get: ProjectStoreGetFunction,
	set: ProjectStoreSetFunction,
): Promise<StorageLocation | undefined | "cancelled"> {
	const repo = get().projectRepository;
	if (!(repo instanceof HybridProjectRepository)) return undefined;
	if (repo.locationOf(project.id) === "cloud") return undefined;
	if ((await repo.get(project.id)) !== null) return undefined;

	const preferred = getPreferredSaveLocation();
	if (preferred === "cloud" && authStore.getState().user) return "cloud";
	if (preferred === "local") return "local";

	// Pas encore de préférence, ou préférence "cloud" sans session active : on demande —
	// dans le second cas, un nouveau choix "cloud" plutôt qu'un aller direct vers la
	// connexion, l'utilisateur pouvant préférer rester en local pour cette fois.
	const persistAsDefault = preferred === null;
	const resolved = await openSaveLocationModal(set);
	if (resolved && persistAsDefault) setPreferredSaveLocation(resolved);
	return resolved ?? "cancelled";
}
