"use client";

import { Emitter } from "mitt";
import { GrafcetContextMenuEvents } from "../context/context-menu-events";
import { JunctionNode } from "../flow/grafcet-nodes-definitions";

export default function junctionContextMenuItems(
	junction: JunctionNode,
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>,
): {
	label: string;
	onClick?: () => void;
	subItems?: {
		label: string;
		onClick: () => void;
	}[];
}[][] {
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
				subItems: junction.data.branchesOrder.map((branchId, index) => ({
					label: "Branche " + (index + 1),
					onClick: () =>
						contextMenuEvents.emit("node-action", {
							nodeId: junction.id,
							type: "junction-select-branch",
							branchId: branchId,
						}),
				})),
			},
		],
	];
}
