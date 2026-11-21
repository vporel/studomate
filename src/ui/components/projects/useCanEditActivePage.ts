import { canEditActivePage } from "@/ui/stores/project/editability";
import { useProjectStore } from "./ProjectContext";

/** Whether the active page can be modified: see `canEditActivePage`. */
export default function useCanEditActivePage(): boolean {
	return useProjectStore(canEditActivePage);
}
