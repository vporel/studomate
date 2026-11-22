import canShare from "@/ui/stores/project/shareability";
import { useProjectStore } from "./ProjectContext";

/** Whether the project can be offered for sharing (see `canShare`). */
export default function useCanShare(): boolean {
	return useProjectStore(canShare);
}
