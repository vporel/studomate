import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { GRAFCET_ELEMENT_TYPES, GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import WorkflowManager from "@/stores/grafcet/managers/WorkflowManager";
import { GrafcetContextMenuElement } from "./grafcet-context-menu";

//The default context menu items for a node in the grafcet editor. This is used when the user right-clicks on a node that does not have a specific context menu defined (like a step or transition).
export default function commonNodeContextMenuItems(
	element: GrafcetContextMenuElement,
	workflowManager: WorkflowManager,
): ContextMenuItemType[][] {
	return [
		[
			{
				label: "Supprimer",
				onClick: () => {
					if (element.type == "custom-edge") {
						workflowManager.deleteEdges([element.id]);
					} else if (GRAFCET_ELEMENT_TYPES.includes(element.type as GrafcetElementType)) {
						workflowManager.deleteNodes([(element as any).id]);
					}
				},
			},
		],
	];
}
