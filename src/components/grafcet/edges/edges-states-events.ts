"use client";

import mitt, { Emitter } from "mitt";
import { CustomEdgeData } from "./CustomEdge";

export const edgeStateEventsIn: Emitter<{
	"set-data": { edgeId: string; data: CustomEdgeData };
}> = mitt();
