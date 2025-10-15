"use client";
import { useProjectContext } from "@/components/projects/ProjectContext";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { GrafcetConnectionsEvents } from "./connections-events";
import { GrafcetContextMenuEvents } from "./context-menu-events";
import { GrafcetElementsEvents } from "./elements-events";
import useCommandsStack from "./useCommandsStack";
import useConnectionsEventsHandler from "./useConnectionsEventsHandler";
import useElementsEventsHandler from "./useElementsEventsHandler";

type GrafcetContextType = {
	grafcet: Grafcet;
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>;
	elementsEvents: Emitter<GrafcetElementsEvents>;
	connectionsEvents: Emitter<GrafcetConnectionsEvents>;
	undoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
	redoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
};

const GrafcetContext = createContext<GrafcetContextType>({
	grafcet: {} as Grafcet,
	contextMenuEvents: mitt<GrafcetContextMenuEvents>(),
	elementsEvents: mitt<GrafcetElementsEvents>(),
	connectionsEvents: mitt<GrafcetConnectionsEvents>(),
	undoLastCommand: () => null,
	redoLastCommand: () => null,
});

export const GrafcetContextProvider = ({
	initialGrafcet,
	children,
}: {
	initialGrafcet: Grafcet;
	children: ReactNode;
}) => {
	const { updateGrafcetData } = useProjectContext();
	const [grafcet, setGrafcet] = useState<Grafcet>(initialGrafcet);
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), []);
	const elementsEvents = useMemo(() => mitt<GrafcetElementsEvents>(), []);
	const connectionsEvents = useMemo(() => mitt<GrafcetConnectionsEvents>(), []);
	const { commandsStackRef, undoLastCommand, redoLastCommand } = useCommandsStack(grafcet, setGrafcet);

	useElementsEventsHandler(elementsEvents, grafcet, setGrafcet, commandsStackRef.current);
	useConnectionsEventsHandler(connectionsEvents, grafcet, setGrafcet, commandsStackRef.current);

	//Listen to grafcet changes
	useEffect(() => {
		if (!grafcet) return;
		updateGrafcetData(grafcet.id, { grafcet });
	}, [grafcet, updateGrafcetData]);

	return (
		<GrafcetContext.Provider
			value={{
				grafcet,
				contextMenuEvents,
				elementsEvents,
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
