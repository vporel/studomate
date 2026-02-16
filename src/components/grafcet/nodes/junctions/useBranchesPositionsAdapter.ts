"use client";

import { JunctionData } from "@/schemas/grafcet/junction.class";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useGrafcetStore } from "../../context/GrafcetContext";

export default function useBranchesPositionsAdapter(
	nodeId: string,
	nodeWidth: number | undefined,
	nodePositionAbsoluteX: number,
) {
	const updateNodeData = useGrafcetStore((state) => state.updateNodeData);
	const oldWidth = useRef(nodeWidth);
	const oldPositionAbsoluteX = useRef(nodePositionAbsoluteX);
	const updateNodeInternals = useUpdateNodeInternals();

	//Update de branches positions when the node is resized
	useEffect(() => {
		if (nodeWidth != oldWidth.current) {
			updateNodeData(nodeId, (d) => {
				const prevData = d as JunctionData;
				if (!prevData || !prevData.branchesPositions) return {};
				const dataToChange: Partial<JunctionData> = {};
				if (nodeWidth != 0) dataToChange.width = nodeWidth;
				if (nodePositionAbsoluteX != oldPositionAbsoluteX.current) {
					const positionDelta = oldPositionAbsoluteX.current - nodePositionAbsoluteX;
					dataToChange.pivotPosition = prevData.pivotPosition + positionDelta;
					dataToChange.branchesPositions = prevData.branchesPositions.map((p) => p + positionDelta);
					oldPositionAbsoluteX.current = nodePositionAbsoluteX;
				}
				return dataToChange;
			});
			updateNodeInternals(nodeId);
			oldWidth.current = nodeWidth;
		}
	}, [nodeId, nodeWidth, nodePositionAbsoluteX, updateNodeData, updateNodeInternals]);
}
