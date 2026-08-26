export type HmiContextMenuElement = { type: "pane" } | { type: "widget"; widgetId: string };

export type HmiContextMenuProps = {
	visible: boolean;
	element: HmiContextMenuElement;
	position: { x: number; y: number };
	onClose: () => void;
	canvasWidth: number;
	canvasHeight: number;
};
