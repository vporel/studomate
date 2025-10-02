"use client";

import mitt, { Emitter } from "mitt";
import { useEffect } from "react";
import { CustomEdgeData } from "./CustomEdge";

export const edgeStateUpdaterEvents: Emitter<{
	"set-data": { edgeId: string; data: CustomEdgeData };
}> = mitt();

export default function useEdgeStateUpdaterEventsHandlers(
	edgeId: string,
	setPoints: (points: [number, number][]) => void
) {
	//Update the points when receiving an event
	useEffect(() => {
		const handler = (e: { edgeId: string; data: CustomEdgeData }) => {
			if (e.edgeId === edgeId) {
				setPoints(e.data.points);
			}
		};

		edgeStateUpdaterEvents.on("set-data", handler);
		return () => {
			edgeStateUpdaterEvents.off("set-data", handler);
		};
	}, [edgeId, setPoints]);
}
