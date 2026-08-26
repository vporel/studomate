import { VariablesPageId } from "@/ui/components/pages/VariablesPage";

export type ExplorerContextMenuElement =
	| { type: "pane" }
	| { type: "programs-folder" }
	| { type: "hmi-folder" }
	| { type: "grafcet"; grafcetId: string }
	| { type: "ladder"; ladderId: string }
	| { type: "variables"; variablesPageId: VariablesPageId }
	| { type: "block-instance"; ladderId: string; elementId: string }
	| { type: "hmi"; hmiPageId: string };
export type ExplorerContextMenuProps = {
	visible: boolean;
	element: ExplorerContextMenuElement;
	position: { x: number; y: number };
	onClose: () => void;
	explorerWidth: number;
	explorerHeight: number;
};
