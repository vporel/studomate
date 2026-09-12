import {
	ClipboardScope,
	getClipboardEntry,
	setClipboardEntry,
} from "@/ui/stores/shared/clipboard.store";

/**
 * Factorise le presse-papiers partagé et l'enchaînement du couper. La copie et le collage
 * restent spécifiques à chaque type de page : géométrie libre (grafcet), grille par section
 * (ladder), canvas absolu (HMI).
 *
 * `TClipboard` porte la forme réelle du contenu copié ; le presse-papiers partagé la stocke
 * en opaque et `readClipboard` la restitue après avoir vérifié que l'entrée vient bien du
 * même `scope` (unique endroit où le cast a lieu, gardé par cette comparaison).
 */
export default abstract class AbstractCopyCutPasteManager<TClipboard> {
	protected abstract readonly scope: ClipboardScope;

	abstract copySelectedElements(): void;
	abstract pasteElements(mousePosition?: { x: number; y: number }): void;
	protected abstract isSelectionEmpty(): boolean;
	protected abstract deleteSelectedElements(): void;

	protected writeClipboard(data: TClipboard): void {
		setClipboardEntry({ scope: this.scope, data });
	}

	protected readClipboard(): TClipboard | null {
		const entry = getClipboardEntry();
		return entry && entry.scope === this.scope
			? (entry.data as TClipboard)
			: null;
	}

	cutSelectedElements(): void {
		if (this.isSelectionEmpty()) return;
		this.copySelectedElements();
		this.deleteSelectedElements();
	}
}
