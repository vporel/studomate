import { GrafcetContextMenuProps } from "../context-menu/grafcet-context-menu";

export type GrafcetContextMenuPaneAction = Record<string, never>;

export type GrafcetContextMenuNodeAction = { nodeId: string } & (
	| { type: "junction-select-pivot" }
	| { type: "junction-select-branch"; branchId: string }
);

export type GrafcetContextMenuEdgeAction = Record<string, never>;

export type GrafcetContextMenuEvents = {
	show: GrafcetContextMenuProps;
	hide: void;
	"pane-action": GrafcetContextMenuPaneAction;
	"node-action": GrafcetContextMenuNodeAction;
	"edge-action": GrafcetContextMenuEdgeAction;
};
