export type ExplorerContextMenuElement = { type: "pane" } | { type: "grafcet"; grafcetId: string };
export type ExplorerContextMenuProps = {
	visible: boolean;
	element: ExplorerContextMenuElement;
	position: { x: number; y: number };
	onClose: () => void;
	explorerWidth: number;
	explorerHeight: number;
};
