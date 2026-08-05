export type ExplorerContextMenuEventsOutGrafcetRename = { grafcetId: string };
export type ExplorerContextMenuEventsOutLadderRename = { ladderId: string };
export type ExplorerContextMenuEventsOut = {
	"grafcet-rename": ExplorerContextMenuEventsOutGrafcetRename;
	"ladder-rename": ExplorerContextMenuEventsOutLadderRename;
};
