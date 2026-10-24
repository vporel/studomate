import type { ClipboardStoreState } from "@/ui/stores/shared/clipboard.store";
import { useStore } from "zustand";
import { useProjectStore } from "./ProjectContext";

/** Selects from the clipboard of the project store the component sits in. */
export default function useProjectClipboard<T>(
	selector: (state: ClipboardStoreState) => T,
): T {
	const clipboard = useProjectStore((state) => state.clipboard);
	return useStore(clipboard, selector);
}
