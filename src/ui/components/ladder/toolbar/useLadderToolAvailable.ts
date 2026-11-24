import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	isLadderToolAvailable,
	type LadderToolId,
} from "@/ui/stores/project/editor-tools";
import { useCallback } from "react";

export default function useLadderToolAvailable() {
	const tools = useProjectStore((state) => state.capabilities.tools);
	return useCallback(
		(id: LadderToolId) => isLadderToolAvailable(tools, id),
		[tools],
	);
}
