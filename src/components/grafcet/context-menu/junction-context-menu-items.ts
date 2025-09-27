"use client";

import { Emitter } from "mitt";
import { GrafcetContextMenuEvents } from "../context/GrafcetContext";
import { JunctionNode } from "../flow/grafcet-nodes-definitions";
import { GrafcetcontextMenuItemType } from "./grafcet-context-menu-types";

export default function junctionContextMenuItems(
	junction: JunctionNode,
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>
): GrafcetcontextMenuItemType[][] {
	return [
		[
			{
				label: "Sélectionner le pivot",
				onClick: () =>
					contextMenuEvents.emit("node-action", {
						nodeId: junction.id,
						type: "junction-select-pivot",
					}),
			},
			{
				label: "Sélectionner une branche",
				subItems: junction.data.branchesPositions.map((_, index) => ({
					label: "Branche " + (index + 1),
					onClick: () =>
						contextMenuEvents.emit("node-action", {
							nodeId: junction.id,
							type: "junction-select-branch",
							branchIndex: index,
						}),
				})),
			},
		],
	];
}
