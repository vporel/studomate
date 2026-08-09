import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { ReactFlowInstance, Viewport } from "@xyflow/react";
import AbstractHighlightingViewManager from "@/ui/stores/shared/abstract-highlighting-view-manager";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction, GrafcetStoreState } from "../grafcet.store";

export const GRAFCET_FLOW_MIN_ZOOM = 1;
export const GRAFCET_FLOW_MAX_ZOOM = 2.5;

/**
 * Aspects de la vue qui ne relèvent pas du domaine : sélection, surlignage, zoom, et
 * l'instance React Flow elle-même.
 *
 * Ne modifie jamais `nodes`/`edges` pour refléter un changement du grafcet — c'est le rôle de
 * `WorkflowManager`, qui passe par le `CommandsStackManager` pour que la vue soit recalculée
 * depuis le domaine (`NodesFactory.syncNodes`, `EdgesFactory.syncEdges`), jamais patchée à la
 * main.
 */
export default class ViewManager extends AbstractHighlightingViewManager<GrafcetStoreState> {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	rfInstance: ReactFlowInstance | null = null;

	/**
	 * Élément racine de la page du grafcet dans le DOM, tenu à jour par `GrafcetFlow` via un
	 * `ref` — source de vérité pour `focus()`, plutôt qu'une reconstruction d'id en chaîne
	 * (`document.getElementById(\`grafcet-${id}\`)`) qui se désynchroniserait silencieusement du
	 * composant si son id venait à changer.
	 */
	private containerElement: HTMLElement | null = null;

	/** Sondage de visibilité en attente pour `focus()` — voir sa documentation. */
	private pendingFocusFrame: { cancel: () => void } | null = null;

	private static readonly FOCUS_MAX_FRAMES = 30; //~0.5s à 60fps : large marge au-dessus d'un simple re-rendu React

	constructor(setStoreState: GrafcetStoreSetFunction, getStoreState: GrafcetStoreGetFunction) {
		super(setStoreState);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	setContainerElement(el: HTMLElement | null): void {
		this.containerElement = el;
	}

	/**
	 * Focalise le flow une fois que sa page est réellement visible.
	 *
	 * Appelée juste après que le store projet ait basculé `activePageId` (voir `Page.tsx`,
	 * `display: none → flex`), avant que React n'ait re-rendu — un `.focus()` synchrone ici
	 * échouerait silencieusement sur un élément encore caché. Sonde `offsetParent` (`null` tant
	 * que `display:none`) au fil des frames plutôt que de parier sur un délai fixe : la
	 * condition de sortie de la boucle sert aussi de revérification — si le scope actif a
	 * changé entre-temps, l'élément est repassé à `display:none` et n'est jamais focalisé.
	 * Abandonne après un nombre borné de frames plutôt que de sonder indéfiniment.
	 */
	focus(): void {
		this.pendingFocusFrame?.cancel();

		let rafId: number;
		let frame = 0;

		const tryFocus = () => {
			const flowElement = this.containerElement?.querySelector<HTMLElement>(".react-flow");
			if (flowElement && flowElement.offsetParent !== null) {
				flowElement.focus({ preventScroll: true });
				this.pendingFocusFrame = null;
				return;
			}
			frame++;
			if (frame >= ViewManager.FOCUS_MAX_FRAMES) {
				if (!this.containerElement) console.warn("ViewManager.focus: containerElement not set");
				this.pendingFocusFrame = null;
				return;
			}
			rafId = requestAnimationFrame(tryFocus);
		};

		rafId = requestAnimationFrame(tryFocus);
		this.pendingFocusFrame = { cancel: () => cancelAnimationFrame(rafId) };
	}

	/**
	 * Throw an error if the view manager is not ready, meaning that the ReactFlow instance is not set yet
	 */
	throwErrorIfNotReady(): void {
		if (this.rfInstance === null) {
			throw new Error("ViewManager is not ready. ReactFlow instance is not set.");
		}
	}

	setReactFlowInstance(instance: ReactFlowInstance): void {
		this.rfInstance = instance;
	}

	getViewport(): Viewport | null {
		return this.getStoreState().viewport;
	}

	setViewport(viewport: Viewport): void {
		this.setStoreState({ viewport });
	}

	getNodes(): GrafcetNodeType[] {
		return this.getStoreState().nodes;
	}

	getEdges(): GrafcetEdgeType[] {
		return this.getStoreState().edges;
	}

	selectAllEdges(): void {
		this.setStoreState((state) => ({ edges: state.edges.map((e) => ({ ...e, selected: true })) }));
	}

	selectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) => ({ ...n, selected: true })),
			edges: state.edges.map((e) => ({ ...e, selected: true })),
		}));
	}

	selectNodesAndEdges(nodesIds: string[], edgesIds: string[], deselectOtherElements = false): void {
		if (deselectOtherElements) {
			this.setStoreState((state) => ({
				nodes: state.nodes.map((n) => ({ ...n, selected: nodesIds.includes(n.id) })),
				edges: state.edges.map((e) => ({ ...e, selected: edgesIds.includes(e.id) })),
			}));
			return;
		} else {
			this.setStoreState((state) => ({
				nodes: state.nodes.map((n) => (nodesIds.includes(n.id) ? { ...n, selected: true } : n)),
				edges: state.edges.map((e) => (edgesIds.includes(e.id) ? { ...e, selected: true } : e)),
			}));
		}
	}

	deselectNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) => (nodesIds.includes(n.id) ? { ...n, selected: false } : n)),
			edges: state.edges.map((e) => (edgesIds.includes(e.id) ? { ...e, selected: false } : e)),
		}));
	}

	deselectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) => ({ ...n, selected: false })),
			edges: state.edges.map((e) => ({ ...e, selected: false })),
		}));
	}

	/**
	 * Annule les surlignages temporaires et le sondage de focus encore en attente. À appeler à
	 * la fermeture de la page du grafcet, avant d'abandonner ce `ViewManager`.
	 */
	dispose(): void {
		this.disposeHighlights();
		this.pendingFocusFrame?.cancel();
		this.pendingFocusFrame = null;
	}

	getZoom(): number {
		if (!this.rfInstance) return 1;
		return this.rfInstance.getZoom();
	}

	zoomIn(): void {
		if (!this.rfInstance) return;
		void this.rfInstance.zoomIn();
	}

	zoomOut(): void {
		if (!this.rfInstance) return;
		void this.rfInstance.zoomOut();
	}

	fitView() {
		if (!this.rfInstance) return;
		void this.rfInstance.fitView();
	}
}
