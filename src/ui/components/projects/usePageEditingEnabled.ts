import { isPageEditingEnabled } from "@/ui/stores/project/editability";
import { useProjectStore } from "./ProjectContext";

/** Whether the page can be edited at all: not locked, and the project not opened read-only. */
export default function usePageEditingEnabled(pageId: string): boolean {
	return useProjectStore((state) => isPageEditingEnabled(state, pageId));
}
