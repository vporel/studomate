"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useEffect } from "react";
import { GrafcetConnectionsEvents } from "./connections-events";

export default function useConnectionsEventsHandler(
	connectionsEvents: Emitter<GrafcetConnectionsEvents>,
	grafcet: Grafcet,
	setGrafcet: Dispatch<SetStateAction<Grafcet>>,
	commandsStack: CommandsStack<Grafcet>
) {
	//add event
	useEffect(() => {
		const handler = (connections: GrafcetConnection[]) => {
			const newGrafcet = commandsStack.execute(
				[new ConnectionsAddCommand(connections)],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		connectionsEvents.on("add", handler);
		return () => {
			connectionsEvents.off("add", handler);
		};
	}, [connectionsEvents, grafcet, setGrafcet, commandsStack]);

	//update event
	useEffect(() => {
		const handler = (connections: GrafcetConnection[]) => {
			const newGrafcet = commandsStack.execute(
				[
					new ConnectionsUpdateCommand(
						connections.map((c) => {
							const previous = grafcet.getConnection(c.source.id, c.target.id);
							if (!previous) throw new Error("Previous connection not found");
							return { connection: c, previous };
						})
					),
				],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		connectionsEvents.on("update", handler);
		return () => {
			connectionsEvents.off("update", handler);
		};
	}, [connectionsEvents, grafcet, setGrafcet, commandsStack]);

	//remove event
	useEffect(() => {
		const handler = (connections: GrafcetConnection[]) => {
			const newGrafcet = commandsStack.execute(
				[new ConnectionsRemoveCommand(connections)],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		connectionsEvents.on("remove", handler);
		return () => {
			connectionsEvents.off("remove", handler);
		};
	}, [connectionsEvents, grafcet, setGrafcet, commandsStack]);
}
