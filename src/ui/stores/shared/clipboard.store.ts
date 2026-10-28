import { createStore, StoreApi } from "zustand";

/**
 * Presse-papiers d'un projet ouvert, partagé par toutes ses pages (grafcet, ladder, HMI).
 * Une seule copie vivante à la fois : une nouvelle copie écrase la précédente. Chaque store
 * projet possède le sien : ses éléments référencent des variables par id, sans validité dans
 * un autre projet ni dans un autre bloc de la même page.
 *
 * Le contenu (`data`) est opaque pour ce module : sa forme réelle est connue du seul
 * gestionnaire copier/coller de chaque type de page (voir `AbstractCopyCutPasteManager`), ce
 * qui évite de coupler cette couche partagée aux schémas de domaine. `scope` permet de
 * refuser un collage vers une page d'un autre type.
 *
 * Store zustand parce que le menu « Édition » doit se griser/dégriser selon le contenu du
 * presse-papiers.
 */

export type ClipboardScope = "grafcet" | "ladder" | "hmi";

export type ClipboardEntry = {
	scope: ClipboardScope;
	data: unknown;
};

export interface ClipboardStoreState {
	entry: ClipboardEntry | null;
	setEntry: (entry: ClipboardEntry) => void;
	clear: () => void;
}

export type ClipboardStore = StoreApi<ClipboardStoreState>;

export function createClipboardStore(): ClipboardStore {
	return createStore<ClipboardStoreState>((set) => ({
		entry: null,
		setEntry: (entry) => set(() => ({ entry })),
		clear: () => set(() => ({ entry: null })),
	}));
}
