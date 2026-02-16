import { GrafcetEdge, GrafcetNode } from "@/components/grafcet/flow/grafcet-nodes-definitions";
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
	setNodes: (updater: (nodes: GrafcetNode[]) => any[]) => void,
	setEdges: (updater: (edges: GrafcetEdge[]) => any[]) => void,
	command: AbstractGrafcetCommand<Grafcet> | null,
) => {
	if (!command) return;
	if (command instanceof ElementsAddCommand) {
		setNodes((nds) => nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1));
	} else if (command instanceof ElementsUpdateCommand) {
		setNodes((nds) =>
			nds.map((n) => {
				const index = command.payload.findIndex((e) => e.id === n.id);
				if (index === -1) return n;
				return {
					...n,
					width:
						command.payload[index].previousData?.width !== undefined
							? command.payload[index].previousData.width
							: n.width,
					height:
						command.payload[index].previousData?.height !== undefined
							? command.payload[index].previousData.height
							: n.height,
					data: { ...n.data, ...command.payload[index].previousData },
					position: { ...n.position, ...command.payload[index].previousPosition },
				} as any;
			}),
		);
	} else if (command instanceof ElementsRemoveCommand) {
		setNodes((nds) => [...nds, ...command.payload]);
	} else if (command instanceof ConnectionsAddCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) => eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1));
	} else if (command instanceof ConnectionsUpdateCommand) {
		if (command.payload.length === 0) return;
		setEdges((eds) =>
			eds.map((e) => {
				const index = command.payload.findIndex((c) => c.connection.id === e.id);
				if (index === -1) return e;
				return {
					...e,
					data: { ...e.data, ...command.payload[index].previous.data },
				};
			}),
		);
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
};

export const commandRedo = (
	rfInstance: ReactFlowInstance,
	setNodes: (updater: (nodes: any[]) => any[]) => void,
	setEdges: (updater: (edges: any[]) => any[]) => void,
	command: AbstractGrafcetCommand<Grafcet> | null,
) => {
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
					width: command.payload[node].data?.width || n.width,
					height: command.payload[node].data?.height || n.height,
					data: { ...n.data, ...command.payload[node].data },
					position: { ...n.position, ...command.payload[node].position },
				};
			}),
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
		setEdges((eds) =>
			eds.map((e) => {
				const index = command.payload.findIndex((c) => c.connection.id === e.id);
				if (index === -1) return e;
				return {
					...e,
					data: { ...e.data, ...command.payload[index].connection.data },
				};
			}),
		);
	} else if (command instanceof ConnectionsRemoveCommand) {
		if (command.payload.length === 0) return;
		rfInstance.setEdges((eds) =>
			eds.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1),
		);
	}
};
