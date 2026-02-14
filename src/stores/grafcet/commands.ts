import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { ReactFlowInstance } from "@xyflow/react";

export const commandUndo = (
	rfInstance: ReactFlowInstance,
	command: AbstractGrafcetCommand<Grafcet> | null,
) => {
	if (!command) return;
	if (command instanceof ElementsAddCommand) {
		rfInstance.setNodes((nds) =>
			nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1),
		);
	} else if (command instanceof ElementsUpdateCommand) {
		rfInstance.setNodes((nds) =>
			nds.map((n) => {
				const index = command.payload.findIndex((e) => e.id === n.id);
				if (index === -1) return n;
				return {
					...n,
					data: { ...n.data, ...command.payload[index].previousData },
					position: { ...n.position, ...command.payload[index].previousPosition },
				};
			}),
		);
		//Emit an event only for the data as the position is handled by reactflow
		command.payload.forEach((nodePayload) => {
			if (nodePayload.previousData)
				nodeStateEventsIn.emit("set-internal-data", {
					nodeId: nodePayload.id,
					data: nodePayload.previousData,
				});
		});
	} else if (command instanceof ElementsRemoveCommand) {
		rfInstance.setNodes((nds) => [...nds, ...command.payload]);
	} else if (command instanceof ConnectionsAddCommand) {
		if (command.payload.length === 0) return;
		rfInstance.setEdges((eds) =>
			eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1),
		);
	} else if (command instanceof ConnectionsUpdateCommand) {
		if (command.payload.length === 0) return;
		for (const c of command.payload) {
			edgeStateEventsIn.emit("set-data", {
				edgeId: c.previous.id,
				data: c.previous.data,
			});
		}
	} else if (command instanceof ConnectionsRemoveCommand) {
		if (command.payload.length === 0) return;
		rfInstance.setEdges((eds) => [
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
};

export const commandRedo = (
	rfInstance: ReactFlowInstance,
	command: AbstractGrafcetCommand<Grafcet> | null,
) => {
	if (!command) return;
	if (command instanceof ElementsAddCommand) {
		rfInstance.setNodes((nds) => [...nds, ...command.payload]);
	} else if (command instanceof ElementsUpdateCommand) {
		rfInstance.setNodes((nds) =>
			nds.map((n) => {
				const node = command.payload.findIndex((e) => e.id === n.id);
				if (node === -1) return n;
				return {
					...n,
					data: { ...n.data, ...command.payload[node].data },
					position: { ...n.position, ...command.payload[node].position },
				};
			}),
		);
		//Emit an event only for the data as the position is handled by reactflow
		command.payload.forEach((nodePayload) => {
			if (nodePayload.data)
				nodeStateEventsIn.emit("set-internal-data", {
					nodeId: nodePayload.id,
					data: nodePayload.data,
				});
		});
	} else if (command instanceof ElementsRemoveCommand) {
		rfInstance.setNodes((nds) =>
			nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1),
		);
	} else if (command instanceof ConnectionsAddCommand) {
		if (command.payload.length === 0) return;
		rfInstance.setEdges((eds) => [
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
			edgeStateEventsIn.emit("set-data", {
				edgeId: c.connection.id,
				data: c.connection.data,
			});
		}
	} else if (command instanceof ConnectionsRemoveCommand) {
		if (command.payload.length === 0) return;
		rfInstance.setEdges((eds) =>
			eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1),
		);
	}
};
