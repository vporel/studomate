"use client";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { PAPERS_SIZES } from "@/constants";
import { mmToPx } from "@/lib/utils";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { Dimensions } from "@xyflow/react";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { GrafcetConnectionsEvents } from "./connections-events";
import { GrafcetContextMenuEvents } from "./context-menu-events";
import { GrafcetElementsEvents } from "./elements-events";
import useCommandsStack from "./useCommandsStack";
import useConnectionsEventsHandler from "./useConnectionsEventsHandler";
import useElementsEventsHandler from "./useElementsEventsHandler";

type GrafcetContextType = {
	grafcetId: string;
	flowDimensions: Dimensions;
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>;
	elementsEvents: Emitter<GrafcetElementsEvents>;
	connectionsEvents: Emitter<GrafcetConnectionsEvents>;
	undoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
	redoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
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
	const { project, updateGrafcetData } = useProjectContext();
	const [grafcet, setGrafcet] = useState<Grafcet>(project!.grafcets[grafcetId]);
	const [flowDimensions, setFlowDimensions] = useState<Dimensions>({
		width: mmToPx(PAPERS_SIZES.A4_PORTRAIT.width),
		height: mmToPx(PAPERS_SIZES.A4_PORTRAIT.height),
	});
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), []);
	const nodesEvents = useMemo(() => mitt<GrafcetElementsEvents>(), []);
	const connectionsEvents = useMemo(() => mitt<GrafcetConnectionsEvents>(), []);
	const { commandsStackRef, undoLastCommand, redoLastCommand } = useCommandsStack(grafcet, setGrafcet);

	useElementsEventsHandler(nodesEvents, grafcet, setGrafcet, commandsStackRef.current);
	useConnectionsEventsHandler(connectionsEvents, grafcet, setGrafcet, commandsStackRef.current);

	//Listen to grafcet changes
	useEffect(() => {
		if (!grafcet) return;
		updateGrafcetData(grafcetId, { grafcet });
	}, [grafcetId, grafcet, updateGrafcetData]);

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
