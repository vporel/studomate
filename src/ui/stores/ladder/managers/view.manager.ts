import AbstractHighlightingViewManager from "@/ui/stores/shared/abstract-highlighting-view-manager";
import { LadderStoreGetFunction, LadderStoreSetFunction, LadderStoreState } from "../ladder.store";

export const LADDER_FLOW_MIN_ZOOM = 1;
export const LADDER_FLOW_MAX_ZOOM = 2.5;

/** Seule la méthode de viewport impérative nous intéresse ici — évite les soucis de variance de
 * générique entre les `ReactFlowInstance<TNode, TEdge>` de chaque section. */
export interface ZoomableInstance {
	setViewport: (
		viewport: { x: number; y: number; zoom: number },
		options?: { duration?: number },
	) => Promise<boolean>;
	screenToFlowPosition: (clientPosition: { x: number; y: number }) => { x: number; y: number };
}

/** Facteur de pas d'un clic sur zoom in/out — même valeur que celle utilisée en interne par
 * React Flow pour `zoomIn`/`zoomOut` (`scaleBy(1.2)`), pour un ressenti cohérent avec le
 * Ctrl+molette natif de la librairie. */
const ZOOM_STEP_FACTOR = 1.2;

/**
 * Contrairement au GRAFCET (un seul flow par page, zoom géré via son unique `rfInstance`), le
 * Ladder a une instance React Flow par section — mais elles doivent zoomer ensemble comme une
 * seule page. Le niveau de zoom est donc un état partagé du store (`zoom`), et chaque section
 * enregistrée ici est resynchronisée impérativement (`zoomTo`) à chaque changement, qu'il vienne
 * des boutons de la toolbar ou d'un Ctrl+molette sur l'une des sections.
 */
export default class ViewManager extends AbstractHighlightingViewManager<LadderStoreState> {
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

	constructor(setStoreState: LadderStoreSetFunction, getStoreState: LadderStoreGetFunction) {
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

	getZoom(): number {
		return this.getStoreState().zoom;
	}

	/**
	 * Fixe `x`/`y` à 0 sur toutes les sections enregistrées, jamais seulement le zoom : la lib
	 * zoome par défaut en gardant le CENTRE du viewport fixe (`d3-zoom` `scaleTo`, utilisé en
	 * interne par `zoomTo`), ce qui décale `x` dès que le zoom change — invisible sur le
	 * contenu React Flow lui-même, mais la barre du rail (bordure CSS statique, hors du
	 * viewport zoomable) reste immobile pendant que le contenu se décale, désolidarisant
	 * visuellement le stub du rail de sa bordure. Le Ladder n'a jamais de pan (`panOnDrag`
	 * false, `translateExtent`/`nodeExtent` verrouillés) : x/y doivent donc toujours valoir 0.
	 */
	private pinAllViewports(zoom: number): void {
		this.instances.forEach((instance) => this.pinViewport(instance, zoom));
	}

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
		if (instance) this.pinViewport(instance, this.getZoom());
	}

	/** Applique `zoom` (borné) au store et le répercute sur toutes les sections enregistrées. */
	private applyZoom(zoom: number): void {
		const clamped = Math.min(LADDER_FLOW_MAX_ZOOM, Math.max(LADDER_FLOW_MIN_ZOOM, zoom));
		if (clamped === this.getStoreState().zoom) return;
		this.setStoreState({ zoom: clamped });
		this.pinAllViewports(clamped);
	}

	/**
	 * À appeler depuis `onMoveEnd` d'une section : propage son zoom (ex. Ctrl+molette) aux
	 * autres, et re-pince systématiquement x/y à 0 sur toutes (y compris celle d'origine, dont le
	 * geste vient justement de décaler x) — même si le zoom résultant est inchangé (ex. déjà à
	 * la borne min/max), un Ctrl+molette peut avoir décalé x sans changer la valeur affichée.
	 * Ignoré si le déplacement vient de notre propre `pinViewport` (voir `pendingProgrammaticMoves`)
	 * — sinon boucle infinie.
	 */
	syncFromInstance(zoom: number): void {
		if (this.pendingProgrammaticMoves > 0) return;
		const clamped = Math.min(LADDER_FLOW_MAX_ZOOM, Math.max(LADDER_FLOW_MIN_ZOOM, zoom));
		this.setStoreState({ zoom: clamped });
		this.pinAllViewports(clamped);
	}

	zoomIn(): void {
		this.applyZoom(this.getZoom() * ZOOM_STEP_FACTOR);
	}

	zoomOut(): void {
		this.applyZoom(this.getZoom() / ZOOM_STEP_FACTOR);
	}

	dispose(): void {
		this.disposeHighlights();
	}
}
