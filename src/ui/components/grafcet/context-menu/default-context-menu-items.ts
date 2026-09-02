import {
	ElementType,
	GRAFCET_ELEMENT_TYPES,
} from "@/schemas/grafcet/element.schema";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import GrafcetCopyCutPasteManager from "@/ui/stores/grafcet/managers/copy-cut-paste.manager";
import GrafcetWorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { GrafcetContextMenuElement } from "./grafcet-context-menu";
import { MenuTranslate } from "./menu-translate";

//The default context menu items for a node in the grafcet editor. This is used when the user right-clicks on a node that does not have a specific context menu defined (like a step or transition).
export default function defaultContextMenuItems(
	element: GrafcetContextMenuElement,
	workflowManager: GrafcetWorkflowManager,
	copyCutPasteManager: GrafcetCopyCutPasteManager,
	t: MenuTranslate,
): ContextMenuItemType[][] {
	return [
		[
			{
				label: t("copy"),
				shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
				onClick: () => copyCutPasteManager.copySelectedElements(),
			},
			{
				label: t("cut"),
				shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
				onClick: () => copyCutPasteManager.cutSelectedElements(),
			},
		],
		[
			{
				label: t("delete"),
				onClick: () => {
					if (element.type == "grafcet-connection") {
						workflowManager.deleteEdges([element.id]);
					} else if (
						GRAFCET_ELEMENT_TYPES.includes(element.type as ElementType)
					) {
						workflowManager.deleteNodes([(element as any).id]);
					}
				},
			},
		],
	];
}
