import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	isGrafcetToolAvailable,
	type GrafcetToolId,
} from "@/ui/stores/project/editor-tools";
import { useCallback } from "react";

export default function useGrafcetToolAvailable() {
	const tools = useProjectStore((state) => state.capabilities.tools);
	return useCallback(
		(id: GrafcetToolId) => isGrafcetToolAvailable(tools, id),
		[tools],
	);
}
