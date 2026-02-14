import { GrafcetContextMenuProps } from "../context-menu/grafcet-context-menu";

export type GrafcetContextMenuPaneAction = {};

export type GrafcetContextMenuNodeAction = { nodeId: string } & (
	| { type: "junction-select-pivot" }
	| { type: "junction-select-branch"; branchIndex: number }
);

export type GrafcetContextMenuEdgeAction = {};

export type GrafcetContextMenuEvents = {
	show: GrafcetContextMenuProps;
	hide: void;
	"pane-action": GrafcetContextMenuPaneAction;
	"node-action": GrafcetContextMenuNodeAction;
	"edge-action": GrafcetContextMenuEdgeAction;
};
