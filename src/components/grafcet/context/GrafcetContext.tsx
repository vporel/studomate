"use client";
import { PAPERS_SIZES } from "@/constants";
import { mmToPx } from "@/lib/utils";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import GrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { Dimensions } from "@xyflow/react";
import mitt, { Emitter } from "mitt";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { GrafcetContextMenuProps } from "../context-menu/grafcet-context-menu-types";
import { GrafcetNode } from "../flow/grafcet-nodes-definitions";
import useConnectionsEventsHandler from "./useConnectionsEventsHandler";
import useElementsEventsHandler from "./useElementsEventsHandler";

export type GrafcetContextMenuPaneAction =
	| { type: "select-all" }
	| { type: "select-all-edges" }
	| { type: "export" };
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

export type GrafcetElementsEvents = {
	add: GrafcetNode[];
	update: GrafcetNode[];
	remove: GrafcetNode[];
};

export type GrafcetConnectionsEvents = {
	add: GrafcetConnection[];
	update: GrafcetConnection[];
	remove: GrafcetConnection[];
};

type GrafcetContextType = {
	grafcetId: string;
	flowDimensions: Dimensions;
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>;
	elementsEvents: Emitter<GrafcetElementsEvents>;
	connectionsEvents: Emitter<GrafcetConnectionsEvents>;
	undoLastCommand: () => GrafcetCommand<any> | null;
	redoLastCommand: () => GrafcetCommand<any> | null;
};

const GrafcetContext = createContext<GrafcetContextType>({
	grafcetId: "",
	flowDimensions: { width: 0, height: 0 },
	contextMenuEvents: mitt<GrafcetContextMenuEvents>(),
	elementsEvents: mitt<GrafcetElementsEvents>(),
	connectionsEvents: mitt<GrafcetConnectionsEvents>(),
	undoLastCommand: () => null,
	redoLastCommand: () => null,
});

export const GrafcetContextProvider = ({
	grafcetId,
	children,
}: {
	grafcetId: string;
	children: ReactNode;
}) => {
	const [grafcet, setGrafcet] = useState<Grafcet | null>(null);
	const [flowDimensions, setFlowDimensions] = useState<Dimensions>({
		width: mmToPx(PAPERS_SIZES.A4_PORTRAIT.width),
		height: mmToPx(PAPERS_SIZES.A4_PORTRAIT.height),
	});
	const commandsStackRef = useRef<CommandsStack<Grafcet>>(new CommandsStack<Grafcet>(100));
	const undoLastCommand = useCallback(() => {
		if (!grafcet) return null;
		const [newGrafcet, command] = commandsStackRef.current.undo(
			Object.assign(Object.create(Grafcet.prototype), { ...grafcet }) as Grafcet
		);
		if (newGrafcet) setGrafcet(newGrafcet);
		return command;
	}, [grafcet]);
	const redoLastCommand = useCallback(() => {
		if (!grafcet) return null;
		const [newGrafcet, command] = commandsStackRef.current.redo(
			Object.assign(Object.create(Grafcet.prototype), grafcet) as Grafcet
		);
		if (newGrafcet) setGrafcet(newGrafcet);
		return command;
	}, [grafcet]);
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), []);
	const nodesEvents = useMemo(() => mitt<GrafcetElementsEvents>(), []);
	const connectionsEvents = useMemo(() => mitt<GrafcetConnectionsEvents>(), []);

	useElementsEventsHandler(nodesEvents, grafcet, setGrafcet, commandsStackRef.current);
	useConnectionsEventsHandler(connectionsEvents, grafcet, setGrafcet, commandsStackRef.current);

	useEffect(() => {
		setGrafcet(new Grafcet(grafcetId, { type: "A4", orientation: "portrait" }));
	}, [grafcetId]);

	console.log(grafcet?.connections);

	return (
		<GrafcetContext.Provider
			value={{
				grafcetId,
				flowDimensions,
				contextMenuEvents,
				elementsEvents: nodesEvents,
				connectionsEvents,
				undoLastCommand,
				redoLastCommand,
			}}
		>
			{children}
		</GrafcetContext.Provider>
	);
};

export const useGrafcetContext = () => useContext(GrafcetContext);
