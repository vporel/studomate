"use client";

import mitt, { Emitter } from "mitt";

export const nodeStateEventsIn: Emitter<{
	"set-internal-data": { nodeId: string; data: Record<string, any> };
}> = mitt();
