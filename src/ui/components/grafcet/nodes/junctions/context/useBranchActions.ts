"use client";

import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { useCallback } from "react";

export default function useBranchActions(nodeId: string): {
	add: (insertIndex: number) => void;
} {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);

	const add = useCallback(
		(insertIndex: number) => {
			workflowManager.addJunctionBranch(nodeId, insertIndex);
		},
		[workflowManager, nodeId],
	);

	return { add };
}
