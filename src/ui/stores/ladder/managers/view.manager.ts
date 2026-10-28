import { clamp } from "@/lib/number";
import AbstractHighlightingViewManager from "@/ui/stores/shared/abstract-highlighting-view-manager";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
	LadderStoreState,
} from "../ladder.store";

export const LADDER_FLOW_MIN_ZOOM = 0.5;
export const LADDER_FLOW_MAX_ZOOM = 2;

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
 * Le Ladder a une instance React Flow par section, toutes au même zoom (état `zoom` du store,
 * piloté par les boutons de la barre d'outils). Chaque section est resynchronisée
 * impérativement à chaque changement de zoom pour repincer x/y à 0 (voir `pinViewport`).
 */
export default class LadderViewManager extends AbstractHighlightingViewManager<LadderStoreState> {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;
	private instances = new Map<string, ZoomableInstance>();
	/**
	 * Nombre d'appels à `setViewport` programmatiques encore en vol. `setViewport` déclenche lui
	 * aussi `onMoveEnd` côté React Flow (vérifié dans `@xyflow/react` — `onTransformChange`
	 * l'appelle à la fin de toute transition de viewport, geste utilisateur ou pas) : sans ce
	 * garde, `pinViewport` → `onMoveEnd` → `syncFromInstance` → `pinViewport` boucle sans fin
	 * dès qu'il y a plus d'une section enregistrée.
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

	getZoom(): number {
		return this.getStoreState().zoom;
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

	private pinAllViewports(zoom: number): void {
		this.instances.forEach((instance) => this.pinViewport(instance, zoom));
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

	/** Applique `zoom` (borné) à toutes les sections et repince leur viewport. */
	private applyZoom(zoom: number): void {
		const clamped = clamp(zoom, LADDER_FLOW_MIN_ZOOM, LADDER_FLOW_MAX_ZOOM);
		if (clamped === this.getZoom()) return;
		this.setStoreState({ zoom: clamped });
		this.pinAllViewports(clamped);
	}

	/**
	 * À appeler depuis `onMoveEnd` d'une section (Ctrl/Cmd + molette compris) : enregistre son zoom
	 * pour toutes les sections et re-pince systématiquement x/y à 0 sur la section source — même si
	 * le zoom résultant est inchangé (ex. déjà à la borne min/max), le geste peut avoir décalé x
	 * sans changer la valeur affichée. Ignoré si le déplacement vient de notre propre
	 * `pinViewport` (voir `pendingProgrammaticMoves`) — sinon boucle infinie.
	 */
	syncFromInstance(sectionId: string, zoom: number): void {
		if (this.pendingProgrammaticMoves > 0) return;
		const clamped = clamp(zoom, LADDER_FLOW_MIN_ZOOM, LADDER_FLOW_MAX_ZOOM);
		if (clamped !== this.getZoom()) {
			this.setStoreState({ zoom: clamped });
			this.pinAllViewports(clamped);
			return;
		}
		const instance = this.instances.get(sectionId);
		if (instance) this.pinViewport(instance, clamped);
	}

	/** Un pas qui traverse 100 % s'y arrête, pour que le zoom initial reste atteignable. */
	private step(factor: number): void {
		const current = this.getZoom();
		const next = current * factor;
		const crossesDefault = (current - 1) * (next - 1) < 0;
		this.applyZoom(crossesDefault ? 1 : next);
	}

	zoomIn(): void {
		this.step(ZOOM_STEP_FACTOR);
	}

	zoomOut(): void {
		this.step(1 / ZOOM_STEP_FACTOR);
	}

	dispose(): void {
		this.disposeHighlights();
	}
}
