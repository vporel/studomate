import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { GrafcetNode } from "../flow/grafcet-nodes-definitions";

//The default context menu items for a node in the grafcet editor. This is used when the user right-clicks on a node that does not have a specific context menu defined (like a step or transition).
export default function commonNodeContextMenuItems(
	node: GrafcetNode,
	actions: { deleteNode: (nodeId: string) => void },
): ContextMenuItemType[][] {
	return [
		[
			{
				label: "Supprimer",
				onClick: () => {
					actions.deleteNode(node.id);
				},
			},
		],
	];
}
