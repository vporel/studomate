"use client";

import { useEffect } from "react";
import { CustomEdgeData } from "./CustomEdge";
import { edgeStateEventsIn } from "./edges-states-events";

export default function useEdgeStateEventsInHandlers(
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

		edgeStateEventsIn.on("set-data", handler);
		return () => {
			edgeStateEventsIn.off("set-data", handler);
		};
	}, [edgeId, setPoints]);
}
