import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { GRAFCET_ELEMENT_TYPES, GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { GrafcetContextMenuElement } from "./grafcet-context-menu";

//The default context menu items for a node in the grafcet editor. This is used when the user right-clicks on a node that does not have a specific context menu defined (like a step or transition).
export default function commonNodeContextMenuItems(
	element: GrafcetContextMenuElement,
	actions: {
		deleteNodes: (nodeIds: string[]) => void;
		deleteEdges: (edgeIds: string[]) => void;
	},
): ContextMenuItemType[][] {
	return [
		[
			{
				label: "Supprimer",
				onClick: () => {
					if (element.type == "custom-edge") {
						actions.deleteEdges([element.id]);
					} else if (GRAFCET_ELEMENT_TYPES.includes(element.type as GrafcetElementType)) {
						actions.deleteNodes([(element as any).id]);
					}
				},
			},
		],
	];
}
