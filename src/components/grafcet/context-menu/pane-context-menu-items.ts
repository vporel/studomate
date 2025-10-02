"use client";

import { Edge, Node } from "@xyflow/react";
import { Emitter } from "mitt";
import { GrafcetContextMenuEvents } from "../context/context-menu-events";
import { GrafcetcontextMenuItemType } from "./grafcet-context-menu";

export default function paneContextMenuItems(
	getNodes: () => Node[],
	getEdges: () => Edge[],
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>
): GrafcetcontextMenuItemType[][] {
	return [
		[
			{
				label: "Tout sélectionner",
				shortcut: "Ctrl+A",
				onClick: () => contextMenuEvents.emit("pane-action", { type: "select-all" }),
				disabled: getNodes().length == 0 && getNodes().length == 0,
			},
			{
				label: "Sélectionner les liaisons",
				onClick: () => contextMenuEvents.emit("pane-action", { type: "select-all-edges" }),
				disabled: getEdges().length == 0,
			},
		],
		[
			{
				label: "Exporter",
				onClick: () => contextMenuEvents.emit("pane-action", { type: "export" }),
				disabled: getNodes().length == 0 && getNodes().length == 0,
			},
		],
	];
}
