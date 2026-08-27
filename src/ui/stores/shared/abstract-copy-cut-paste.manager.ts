/**
 * Factorise le presse-papiers et l'enchaînement du couper — identiques entre le
 * `GrafcetCopyCutPasteManager` et le `LadderCopyCutPasteManager`. La copie et le collage
 * restent spécifiques : géométrie libre (grafcet) contre grille par section (ladder).
 */
export default abstract class AbstractCopyCutPasteManager<TClipboard> {
	protected clipboard: TClipboard | null = null;

	abstract copySelectedElements(): void;
	abstract pasteElements(mousePosition?: { x: number; y: number }): void;
	protected abstract isSelectionEmpty(): boolean;
	protected abstract deleteSelectedElements(): void;

	cutSelectedElements(): void {
		if (this.isSelectionEmpty()) return;
		this.copySelectedElements();
		this.deleteSelectedElements();
	}
}
