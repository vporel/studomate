import { canEdit } from "@/ui/stores/project/editability";
import { useProjectStore } from "./ProjectContext";

/** Whether the project can be modified: in design mode, and not opened read-only. */
export default function useCanEdit(): boolean {
	return useProjectStore(canEdit);
}
