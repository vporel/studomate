export interface HighlightableStoreState {
	highlightedNodesIds: string[];
	highlightedEdgesIds: string[];
}

/**
 * Factorise le surlignage temporaire, identique entre le `ViewManager` du GRAFCET (une instance
 * React Flow) et celui du Ladder (N sections synchronisées) — seule la façon dont chacun gère le
 * reste de la vue diverge réellement.
 */
export default abstract class AbstractHighlightingViewManager<TState extends HighlightableStoreState> {
	/**
	 * Minuteries de surlignage temporaire en attente. Suivies pour pouvoir les annuler à la
	 * fermeture de la page : sans ça, un `setTimeout` en attente continuait de déclencher un
	 * `setStoreState` après que le store ait été abandonné, sur une instance de `ViewManager`
	 * que plus personne ne lit.
	 */
	private pendingHighlightTimeouts = new Set<ReturnType<typeof setTimeout>>();

	constructor(private setHighlightState: (updater: (state: TState) => Partial<TState>) => void) {}

	highlightNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setHighlightState((state) => ({
			highlightedNodesIds: [...(state.highlightedNodesIds || []), ...nodesIds],
			highlightedEdgesIds: [...(state.highlightedEdgesIds || []), ...edgesIds],
		} as Partial<TState>));
	}

	unhighlightNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setHighlightState((state) => ({
			highlightedNodesIds: state.highlightedNodesIds?.filter((id) => !nodesIds.includes(id)),
			highlightedEdgesIds: state.highlightedEdgesIds?.filter((id) => !edgesIds.includes(id)),
		} as Partial<TState>));
	}

	temporarilyHighlightNodesAndEdges(nodesIds: string[], edgesIds: string[], durationMs = 2000): void {
		this.highlightNodesAndEdges(nodesIds, edgesIds);
		const timeout = setTimeout(() => {
			this.pendingHighlightTimeouts.delete(timeout);
			this.unhighlightNodesAndEdges(nodesIds, edgesIds);
		}, durationMs);
		this.pendingHighlightTimeouts.add(timeout);
	}

	/**
	 * Annule les surlignages temporaires encore en attente. À appeler à la fermeture de la page,
	 * avant d'abandonner ce `ViewManager` — les sous-classes l'appellent depuis leur propre
	 * `dispose()`, qui a d'autres ressources à libérer en plus de celle-ci.
	 */
	protected disposeHighlights(): void {
		this.pendingHighlightTimeouts.forEach((timeout) => clearTimeout(timeout));
		this.pendingHighlightTimeouts.clear();
	}
}
