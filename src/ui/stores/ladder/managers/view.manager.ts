import AbstractHighlightingViewManager from "@/ui/stores/shared/abstract-highlighting-view-manager";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
	LadderStoreState,
} from "../ladder.store";

export const LADDER_FLOW_MIN_ZOOM = 1;
export const LADDER_FLOW_MAX_ZOOM = 2.5;

/** Seule la méthode de viewport impérative nous intéresse ici — évite les soucis de variance de
 * générique entre les `ReactFlowInstance<TNode, TEdge>` de chaque section. */
export interface ZoomableInstance {
	setViewport: (
		viewport: { x: number; y: number; zoom: number },
		options?: { duration?: number },
	) => Promise<boolean>;
	screenToFlowPosition: (clientPosition: { x: number; y: number }) => {
		x: number;
		y: number;
	};
}

/** Facteur de pas d'un clic sur zoom in/out — même valeur que celle utilisée en interne par
 * React Flow pour `zoomIn`/`zoomOut` (`scaleBy(1.2)`), pour un ressenti cohérent avec le
 * Ctrl+molette natif de la librairie. */
const ZOOM_STEP_FACTOR = 1.2;

/**
 * Le Ladder a une instance React Flow par section, chacune avec son propre zoom (état
 * `zoomBySectionId` du store, piloté par les boutons de l'en-tête de section). Chaque section est
 * resynchronisée impérativement à chaque changement de son zoom pour repincer x/y à 0 (voir
 * `pinViewport`).
 */
export default class LadderViewManager extends AbstractHighlightingViewManager<LadderStoreState> {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;
	private instances = new Map<string, ZoomableInstance>();
	/**
	 * Nombre d'appels à `setViewport` programmatiques encore en vol. `setViewport` déclenche lui
	 * aussi `onMoveEnd` côté React Flow (vérifié dans `@xyflow/react` — `onTransformChange`
	 * l'appelle à la fin de toute transition de viewport, geste utilisateur ou pas) : sans ce
	 * garde, `pinAllViewports` → `onMoveEnd` → `syncFromInstance` → `pinAllViewports` boucle sans
	 * fin dès qu'il y a plus d'une section enregistrée.
	 */
	private pendingProgrammaticMoves = 0;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		super(setStoreState);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	registerInstance(sectionId: string, instance: ZoomableInstance): void {
		this.instances.set(sectionId, instance);
	}

	getInstance(sectionId: string): ZoomableInstance | undefined {
		return this.instances.get(sectionId);
	}

	unregisterInstance(sectionId: string): void {
		this.instances.delete(sectionId);
	}

	getZoom(sectionId: string): number {
		return this.getStoreState().zoomBySectionId[sectionId] ?? 1;
	}

	/**
	 * Fixe `x`/`y` à 0 sur la section, jamais seulement le zoom : la lib zoome par défaut en
	 * gardant le CENTRE du viewport fixe (`d3-zoom` `scaleTo`, utilisé en interne par `zoomTo`),
	 * ce qui décale `x` dès que le zoom change — invisible sur le contenu React Flow lui-même,
	 * mais la barre du rail (bordure CSS statique, hors du viewport zoomable) reste immobile
	 * pendant que le contenu se décale, désolidarisant visuellement le stub du rail de sa
	 * bordure. Le Ladder n'a jamais de pan (`panOnDrag` false, `translateExtent`/`nodeExtent`
	 * verrouillés) : x/y doivent donc toujours valoir 0.
	 */
	private pinViewport(instance: ZoomableInstance, zoom: number): void {
		this.pendingProgrammaticMoves++;
		void instance.setViewport({ x: 0, y: 0, zoom }).finally(() => {
			this.pendingProgrammaticMoves--;
		});
	}

	/**
	 * À appeler une fois une section prête (`onInit`) : corrige un éventuel viewport initial
	 * incohérent (voir `LadderSection.tsx`) sans passer par `syncFromInstance`, qui
	 * resynchroniserait inutilement toutes les autres sections pour un simple montage.
	 */
	resetViewport(sectionId: string): void {
		const instance = this.instances.get(sectionId);
		if (instance) this.pinViewport(instance, this.getZoom(sectionId));
	}

	private setSectionZoom(sectionId: string, zoom: number): number {
		const clamped = Math.min(
			LADDER_FLOW_MAX_ZOOM,
			Math.max(LADDER_FLOW_MIN_ZOOM, zoom),
		);
		this.setStoreState((state) => ({
			zoomBySectionId: { ...state.zoomBySectionId, [sectionId]: clamped },
		}));
		return clamped;
	}

	/** Applique `zoom` (borné) à la section et repince son viewport. */
	private applyZoom(sectionId: string, zoom: number): void {
		if (
			this.clamp(zoom) === (this.getStoreState().zoomBySectionId[sectionId] ?? 1)
		)
			return;
		const clamped = this.setSectionZoom(sectionId, zoom);
		const instance = this.instances.get(sectionId);
		if (instance) this.pinViewport(instance, clamped);
	}

	private clamp(zoom: number): number {
		return Math.min(
			LADDER_FLOW_MAX_ZOOM,
			Math.max(LADDER_FLOW_MIN_ZOOM, zoom),
		);
	}

	/**
	 * À appeler depuis `onMoveEnd` d'une section : enregistre son zoom et re-pince systématiquement
	 * x/y à 0 — même si le zoom résultant est inchangé (ex. déjà à la borne min/max), le geste peut
	 * avoir décalé x sans changer la valeur affichée. Ignoré si le déplacement vient de notre propre
	 * `pinViewport` (voir `pendingProgrammaticMoves`) — sinon boucle infinie.
	 */
	syncFromInstance(sectionId: string, zoom: number): void {
		if (this.pendingProgrammaticMoves > 0) return;
		const clamped = this.setSectionZoom(sectionId, zoom);
		const instance = this.instances.get(sectionId);
		if (instance) this.pinViewport(instance, clamped);
	}

	zoomIn(sectionId: string): void {
		this.applyZoom(sectionId, this.getZoom(sectionId) * ZOOM_STEP_FACTOR);
	}

	zoomOut(sectionId: string): void {
		this.applyZoom(sectionId, this.getZoom(sectionId) / ZOOM_STEP_FACTOR);
	}

	dispose(): void {
		this.disposeHighlights();
	}
}
