'use client'
import { useStore, XYPosition } from "@xyflow/react";
import { pointToRendererPoint } from "@xyflow/system";
import { useMemo } from "react";

/**
 * This hooks has been made to override some functions
 * Example : screenToFlowPosition in order ot prevent the selection from fitting the snapgrid
 * @returns 
 */
export function useCustomViewportHelper(){
	const { transform, domNode } = useStore(state => ({transform: state.transform, domNode: state.domNode}))
	return useMemo(() => ({
		screenToFlowPosition: (clientPosition: XYPosition) => {
			if (!domNode) return clientPosition;
			const { x: domX, y: domY } = domNode.getBoundingClientRect();
			const correctedPosition = { x: clientPosition.x - domX, y: clientPosition.y - domY };
			return pointToRendererPoint(correctedPosition, transform);
		}
	}), [])
}