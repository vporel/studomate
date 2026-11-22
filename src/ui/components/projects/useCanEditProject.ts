import { canEditProject } from "@/ui/stores/project/editability";
import { useProjectStore } from "./ProjectContext";

/** Whether the project can be modified at all, whatever the active page: see `canEditProject`. */
export default function useCanEditProject(): boolean {
	return useProjectStore(canEditProject);
}
