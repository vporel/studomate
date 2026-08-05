import { StoreApi } from "zustand";
import GrafcetsManager from "@/ui/stores/project/managers/grafcets.manager";
import { GrafcetStoreState } from "@/ui/stores/grafcet/grafcet.store";

/**
 * Répercute les changements du store d'un grafcet vers le projet.
 *
 * `store.subscribe` sans sélecteur se déclenche à **chaque** changement du store, y compris
 * une simple sélection de nœud (qui ne touche que `nodes`/`edges`, pas `grafcet`). Sans le
 * garde-fou sur la référence, `updateGrafcetData` relancerait sa comparaison profonde du
 * grafcet entier à chaque frame de sélection, alors que `state.grafcet` n'a pas bougé.
 *
 * Extrait du composant pour rester testable sans monter React : la logique ne dépend que du
 * store vanilla zustand.
 *
 * @returns La fonction de désabonnement.
 */
export function syncGrafcetToProject(
	store: StoreApi<GrafcetStoreState>,
	grafcetsManager: GrafcetsManager,
): () => void {
	let lastGrafcet = store.getState().grafcet;
	return store.subscribe((state) => {
		if (state.grafcet !== lastGrafcet) {
			lastGrafcet = state.grafcet;
			grafcetsManager.updateGrafcetData(state.grafcet);
		}
		grafcetsManager.setGrafcetStoreValues(state.grafcet.id, {
			hasCommandsToUndo: state.hasCommandsToUndo,
			hasCommandsToRedo: state.hasCommandsToRedo,
		});
	});
}
