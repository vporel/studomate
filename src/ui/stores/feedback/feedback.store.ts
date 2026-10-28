import { createStore, useStore } from "zustand";

/** `prompt`: the app asks; `menu`: the user chose "Donner un avis". */
export type FeedbackBoxSource = "prompt" | "menu";

export type FeedbackStoreState = {
	/** Where the feedback box comes from; `null` while it is hidden. */
	source: FeedbackBoxSource | null;
	open: (source: FeedbackBoxSource) => void;
	close: () => void;
};

export const feedbackStore = createStore<FeedbackStoreState>((set, get) => ({
	source: null,
	open: (source) => {
		if (get().source === null) set({ source });
	},
	close: () => set({ source: null }),
}));

export function useFeedbackStore<T>(
	selector: (state: FeedbackStoreState) => T,
) {
	return useStore(feedbackStore, selector);
}
