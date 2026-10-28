import type {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { ReactFlowInstance } from "@xyflow/react";
import { clamp } from "@/lib/number";
import AbstractHighlightingViewManager from "@/ui/stores/shared/abstract-highlighting-view-manager";
import {
	GrafcetStoreGetFunction,
	GrafcetStoreSetFunction,
	GrafcetStoreState,
} from "../grafcet.store";

export const GRAFCET_FLOW_MIN_ZOOM = 0.5;
export const GRAFCET_FLOW_MAX_ZOOM = 2;

/** Facteur de pas d'un clic sur zoom in/out — celui de React Flow (`scaleBy(1.2)`). */
const ZOOM_STEP_FACTOR = 1.2;

/** Tolérance sur les coordonnées du viewport verrouillé (voir `syncFromInstance`). */
const VIEWPORT_EPSILON = 1e-3;

/**
 * Aspects de la vue qui ne relèvent pas du domaine : sélection, surlignage, zoom, et
 * l'instance React Flow elle-même.
 *
 * Ne modifie jamais `nodes`/`edges` pour refléter un changement du grafcet — c'est le rôle de
 * `GrafcetWorkflowManager`, qui passe par le `GrafcetCommandsStackManager` pour que la vue soit recalculée
 * depuis le domaine (`NodesFactory.syncNodes`, `EdgesFactory.syncEdges`), jamais patchée à la
 * main.
 */
export default class GrafcetViewManager extends AbstractHighlightingViewManager<GrafcetStoreState> {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	rfInstance: ReactFlowInstance | null = null;

	/**
	 * Vrai quand la page est affichée à sa taille réelle (zoom compris) dans un conteneur qui
	 * défile : le viewport reste alors verrouillé à (0,0) et le zoom du store en est la seule
	 * donnée. Faux quand le grafcet est ajusté à son conteneur (`fitView`).
	 */
	private viewportPinned = false;

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

	constructor(
		setStoreState: GrafcetStoreSetFunction,
		getStoreState: GrafcetStoreGetFunction,
	) {
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
			const flowElement =
				this.containerElement?.querySelector<HTMLElement>(".react-flow");
			if (flowElement && flowElement.offsetParent !== null) {
				flowElement.focus({ preventScroll: true });
				this.pendingFocusFrame = null;
				return;
			}
			frame++;
			if (frame >= GrafcetViewManager.FOCUS_MAX_FRAMES) {
				if (!this.containerElement)
					console.warn("GrafcetViewManager.focus: containerElement not set");
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
			throw new Error(
				"GrafcetViewManager is not ready. ReactFlow instance is not set.",
			);
		}
	}

	setReactFlowInstance(instance: ReactFlowInstance): void {
		this.rfInstance = instance;
		if (this.getStoreState().zoom === null) this.setZoom(instance.getZoom());
	}

	setViewportPinned(pinned: boolean): void {
		this.viewportPinned = pinned;
	}

	/**
	 * Verrouille le viewport à (0,0) au zoom du store : la lib zoome par défaut autour du centre
	 * ou du curseur, ce qui décalerait la page par rapport à son cadre, dont la taille suit le
	 * zoom. Sans effet quand la page est ajustée à son conteneur.
	 */
	pinViewport(): void {
		if (!this.viewportPinned || !this.rfInstance) return;
		void this.rfInstance.setViewport({
			x: 0,
			y: 0,
			zoom: this.getStoreState().zoom ?? 1,
		});
	}

	/** Applique `zoom` (borné) au store et au viewport verrouillé. */
	applyZoom(zoom: number): void {
		this.setZoom(clamp(zoom, GRAFCET_FLOW_MIN_ZOOM, GRAFCET_FLOW_MAX_ZOOM));
		this.pinViewport();
	}

	/**
	 * À appeler en fin de déplacement du viewport : un geste (Ctrl/Cmd + molette, pincement) l'a
	 * peut-être décalé ou zoomé. Reprend son zoom et le re-verrouille à (0,0). Sans effet quand
	 * le viewport est déjà au zoom du store et à l'origine, ce qui évite de boucler sur le
	 * déplacement que `pinViewport` provoque lui-même.
	 */
	syncFromInstance(viewport: { x: number; y: number; zoom: number }): void {
		if (!this.viewportPinned) return;
		const zoom = clamp(
			viewport.zoom,
			GRAFCET_FLOW_MIN_ZOOM,
			GRAFCET_FLOW_MAX_ZOOM,
		);
		const settled =
			Math.abs(viewport.x) < VIEWPORT_EPSILON &&
			Math.abs(viewport.y) < VIEWPORT_EPSILON &&
			Math.abs(viewport.zoom - zoom) < VIEWPORT_EPSILON &&
			this.getStoreState().zoom === zoom;
		if (settled) return;
		this.applyZoom(zoom);
	}

	/** Reflects the zoom of the flow in the store, so that the zoom tools follow it. */
	setZoom(zoom: number): void {
		if (this.getStoreState().zoom === zoom) return;
		this.setStoreState({ zoom });
	}

	setMinZoom(minZoom: number): void {
		if (this.getStoreState().minZoom === minZoom) return;
		this.setStoreState({ minZoom });
	}

	getNodes(): GrafcetNodeType[] {
		return this.getStoreState().nodes;
	}

	getEdges(): GrafcetEdgeType[] {
		return this.getStoreState().edges;
	}

	selectAllEdges(): void {
		this.setStoreState((state) => ({
			edges: state.edges.map((e) =>
				e.selected ? e : { ...e, selected: true },
			),
		}));
	}

	selectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) =>
				n.selected ? n : { ...n, selected: true },
			),
			edges: state.edges.map((e) =>
				e.selected ? e : { ...e, selected: true },
			),
		}));
	}

	selectNodesAndEdges(
		nodesIds: string[],
		edgesIds: string[],
		deselectOtherElements = false,
	): void {
		if (deselectOtherElements) {
			this.setStoreState((state) => ({
				nodes: state.nodes.map((n) => {
					const selected = nodesIds.includes(n.id);
					return n.selected === selected ? n : { ...n, selected };
				}),
				edges: state.edges.map((e) => {
					const selected = edgesIds.includes(e.id);
					return e.selected === selected ? e : { ...e, selected };
				}),
			}));
			return;
		} else {
			this.setStoreState((state) => ({
				nodes: state.nodes.map((n) =>
					nodesIds.includes(n.id) ? { ...n, selected: true } : n,
				),
				edges: state.edges.map((e) =>
					edgesIds.includes(e.id) ? { ...e, selected: true } : e,
				),
			}));
		}
	}

	deselectNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) =>
				nodesIds.includes(n.id) ? { ...n, selected: false } : n,
			),
			edges: state.edges.map((e) =>
				edgesIds.includes(e.id) ? { ...e, selected: false } : e,
			),
		}));
	}

	deselectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((n) =>
				n.selected ? { ...n, selected: false } : n,
			),
			edges: state.edges.map((e) =>
				e.selected ? { ...e, selected: false } : e,
			),
		}));
	}

	/**
	 * Annule les surlignages temporaires et le sondage de focus encore en attente. À appeler à
	 * la fermeture de la page du grafcet, avant d'abandonner ce `GrafcetViewManager`.
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

	/** Un pas qui traverse 100 % s'y arrête, pour que le zoom initial reste atteignable. */
	private stepPinnedZoom(factor: number): void {
		const current = this.getStoreState().zoom ?? 1;
		const next = current * factor;
		const crossesDefault = (current - 1) * (next - 1) < 0;
		this.applyZoom(crossesDefault ? 1 : next);
	}

	zoomIn(): void {
		if (!this.rfInstance) return;
		if (this.viewportPinned) this.stepPinnedZoom(ZOOM_STEP_FACTOR);
		else void this.rfInstance.zoomIn();
	}

	zoomOut(): void {
		if (!this.rfInstance) return;
		if (this.viewportPinned) this.stepPinnedZoom(1 / ZOOM_STEP_FACTOR);
		else void this.rfInstance.zoomOut();
	}

	fitView() {
		if (!this.rfInstance) return;
		void this.rfInstance.fitView();
	}
}
