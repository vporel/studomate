"use client";

import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import { useReactFlow } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { edgeStateUpdaterEvents } from "../edges/useEdgeStateUpdaterEventsHandlers";

function commandUndo(
	command: AbstractGrafcetCommand<any> | null,
	setNodes: (payload: any[] | ((nodes: any[]) => any[])) => void,
	setEdges: (payload: any[] | ((edges: any[]) => any[])) => void
) {
	if (!command) return;
	if (command instanceof ElementsAddCommand) {
		setNodes((nds) => nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1));
	} else if (command instanceof ElementsUpdateCommand) {
		setNodes((nds) =>
			nds.map((n) => {
				const node = command.payload.findIndex((e) => e.id === n.id);
				if (node === -1) return n;
				return {
					...n,
					data: { ...n.data, ...command.payload[node].previousData },
					position: command.payload[node].previousPosition,
				};
			})
		);
	} else if (command instanceof ElementsRemoveCommand) {
		setNodes((nds) => [...nds, ...command.payload]);
	} else if (command instanceof ConnectionsAddCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) => eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1));
	} else if (command instanceof ConnectionsUpdateCommand) {
		if (command.payload.length === 0) return;
		for (const c of command.payload) {
			edgeStateUpdaterEvents.emit("set-data", {
				edgeId: c.previous.id,
				data: c.previous.data,
			});
		}
	} else if (command instanceof ConnectionsRemoveCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) => [
			...eds,
			...command.payload.map((c) => ({
				type: "custom-edge",
				id: c.id,
				source: c.source.id,
				sourceHandle: c.source.handleId,
				target: c.target.id,
				targetHandle: c.target.handleId,
				data: c.data,
			})),
		]);
	}
}

function commandRedo(
	command: AbstractGrafcetCommand<any> | null,
	setNodes: (payload: any[] | ((nodes: any[]) => any[])) => void,
	setEdges: (payload: any[] | ((edges: any[]) => any[])) => void
) {
	if (!command) return;
	if (command instanceof ElementsAddCommand) {
		setNodes((nds) => [...nds, ...command.payload]);
	} else if (command instanceof ElementsUpdateCommand) {
		setNodes((nds) =>
			nds.map((n) => {
				const node = command.payload.findIndex((e) => e.id === n.id);
				if (node === -1) return n;
				return {
					...n,
					data: { ...n.data, ...command.payload[node].data },
					position: command.payload[node].position,
				};
			})
		);
	} else if (command instanceof ElementsRemoveCommand) {
		setNodes((nds) => nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1));
	} else if (command instanceof ConnectionsAddCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) => [
			...eds,
			...command.payload.map((c) => ({
				type: "custom-edge",
				id: c.id,
				source: c.source.id,
				sourceHandle: c.source.handleId,
				target: c.target.id,
				targetHandle: c.target.handleId,
				data: c.data,
			})),
		]);
	} else if (command instanceof ConnectionsUpdateCommand) {
		if (command.payload.length === 0) return;
		for (const c of command.payload) {
			edgeStateUpdaterEvents.emit("set-data", {
				edgeId: c.connection.id,
				data: c.connection.data,
			});
		}
	} else if (command instanceof ConnectionsRemoveCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) => eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1));
	}
}

export default function useShortcutsHandler(): (e: React.KeyboardEvent) => void {
	const { setNodes, setEdges } = useReactFlow();
	const { undoLastCommand, redoLastCommand } = useGrafcetContext();

	return useCallback(
		(e: React.KeyboardEvent) => {
			//Ctrl+A : Select all
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "a": {
						e.preventDefault();
						setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
						break;
					}
					case "z": {
						e.preventDefault();
						const commands = undoLastCommand();
						for (const command of commands ?? []) {
							commandUndo(command, setNodes, setEdges);
						}
						break;
					}
					case "y": {
						e.preventDefault();
						const commands = redoLastCommand();
						for (const command of commands ?? []) {
							commandRedo(command, setNodes, setEdges);
						}
						break;
					}
				}
			}
		},
		[setNodes, undoLastCommand, setEdges, redoLastCommand]
	);
}
