import { createStore, useStore } from "zustand";

export type WhatsNewStoreState = {
	visible: boolean;
	open: () => void;
	close: () => void;
};

export const whatsNewStore = createStore<WhatsNewStoreState>((set) => ({
	visible: false,
	open: () => set({ visible: true }),
	close: () => set({ visible: false }),
}));

export function useWhatsNewStore<T>(
	selector: (state: WhatsNewStoreState) => T,
) {
	return useStore(whatsNewStore, selector);
}
