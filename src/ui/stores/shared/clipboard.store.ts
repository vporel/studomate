import { createStore, useStore } from "zustand";

/**
 * Presse-papiers unique de l'application, partagé par toutes les pages (grafcet, ladder, HMI).
 * Une seule copie vivante à la fois : une nouvelle copie écrase la précédente.
 *
 * Le contenu (`data`) est opaque pour ce module — sa forme réelle est connue du seul
 * gestionnaire copier/coller de chaque type de page (voir `AbstractCopyCutPasteManager`), ce
 * qui évite de coupler cette couche partagée aux schémas de domaine. `scope` permet de
 * refuser un collage vers une page d'un autre type.
 *
 * Store zustand (et non simple objet de module comme `mouse-position`) parce que le menu
 * « Édition » doit se griser/dégriser selon le contenu du presse-papiers.
 */

export type ClipboardScope = "grafcet" | "ladder" | "hmi";

export type ClipboardEntry = {
	scope: ClipboardScope;
	data: unknown;
};

interface ClipboardStoreState {
	entry: ClipboardEntry | null;
	setEntry: (entry: ClipboardEntry) => void;
	clear: () => void;
}

const clipboardStore = createStore<ClipboardStoreState>((set) => ({
	entry: null,
	setEntry: (entry) => set(() => ({ entry })),
	clear: () => set(() => ({ entry: null })),
}));

export default clipboardStore;

export function useClipboardStore<T>(
	selector: (state: ClipboardStoreState) => T,
): T {
	return useStore(clipboardStore, selector);
}

export function getClipboardEntry(): ClipboardEntry | null {
	return clipboardStore.getState().entry;
}

export function setClipboardEntry(entry: ClipboardEntry): void {
	clipboardStore.getState().setEntry(entry);
}

export function clearClipboard(): void {
	clipboardStore.getState().clear();
}

export function canPasteInScope(scope: ClipboardScope): boolean {
	const entry = clipboardStore.getState().entry;
	return entry !== null && entry.scope === scope;
}
