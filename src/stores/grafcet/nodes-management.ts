import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { deepObjectsComparison } from "@/lib/object";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import GrafcetElement, { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { ReactFlowInstance } from "@xyflow/react";

export const getInitialNodes = (grafcet: Grafcet): GrafcetNodeType[] => {
	const elementsByType: Record<string, GrafcetElement<any>[]> = {
		step: grafcet.steps,
		action: grafcet.actions,
		transition: grafcet.transitions,
		"step-referral-source": grafcet.stepsReferralsSources,
		"step-referral-target": grafcet.stepsReferralsTargets,
		"junction-and-start": grafcet.junctionsAndStarts,
		"junction-and-end": grafcet.junctionsAndEnds,
		"junction-or-start": grafcet.junctionsOrStarts,
		"junction-or-end": grafcet.junctionsOrEnds,
		comment: grafcet.comments,
	};
	const nodes: GrafcetNodeType[] = [];
	(Object.keys(elementsByType) as GrafcetElementType[]).forEach((type) => {
		const elements = elementsByType[type];
		elements.forEach((element) => {
			nodes.push({
				id: element.id,
				type,
				data: element.data,
				position: element.position,
			} as GrafcetNodeType);
		});
	});
	return nodes;
};

export const handleNodesAdd = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	setNodes: (updater: (nodes: any[]) => any[]) => void,
	newNodes: GrafcetNodeType[],
): AbstractGrafcetCommand<any>[] => {
	const existingNodes = rfInstance.getNodes();
	const nodesToAdd = newNodes.filter((n) => !existingNodes.find((en) => en.id === n.id));
	//Add the nodes to the flow
	setNodes((nds) => [...nds, ...nodesToAdd]);
	return [
		new ElementsAddCommand(
			newNodes.map((node) => ({
				type: node.type,
				id: node.id,
				data: node.data,
				position: node.position,
			})),
		),
	];
};

export const handleNodesDelete = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	setNodes: (updater: (nodes: any[]) => any[]) => void,
	setEdges: (updater: (edges: any[]) => any[]) => void,
	nodesIds: string[],
): AbstractGrafcetCommand<any>[] => {
	const connections: GrafcetConnection[] = grafcet.connections.filter(
		(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
	);

	setNodes((nds) => nds.filter((n) => !nodesIds.includes(n.id)));
	setEdges((eds) => eds.filter((e) => !connections.find((c) => c.id === e.id)));
	const nodesToRemove = nodesIds
		.map((id) => rfInstance.getNode(id))
		.filter((n): n is GrafcetNodeType => !!n)
		.map((node) => ({
			type: node.type,
			id: node.id,
			data: node.data,
			position: node.position,
		}));
	if (nodesToRemove.length === 0) return [];
	const commands: AbstractGrafcetCommand<any>[] = [new ElementsRemoveCommand(nodesToRemove)];
	if (connections.length > 0) commands.push(new ConnectionsRemoveCommand(connections));
	return commands;
};

export const handleNodeDataChange = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	nodeId: string,
	newData:
		| Partial<GrafcetNodeType["data"]>
		| ((prevData: GrafcetNodeType["data"]) => Partial<GrafcetNodeType["data"]>),
	setNode: (nodeId: string, updater: (node: GrafcetNodeType) => GrafcetNodeType) => void,
): AbstractGrafcetCommand<any>[] => {
	const node = rfInstance.getNode(nodeId);
	if (!node) return [];
	if (typeof newData === "function") {
		const prevData = node.data as any;
		newData = newData(prevData);
	}
	setNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...newData } }) as GrafcetNodeType);
	const grafcetElement = grafcet.getElement(node.type as GrafcetElementType, node.id);
	if (!grafcetElement) return [];
	const fullModifiedData = { ...grafcetElement.data, ...newData };
	//Make sure the data is not the same as the previous one, to avoid creating unnecessary commands
	if (deepObjectsComparison(grafcetElement.data, fullModifiedData)) {
		return [];
	}
	return [
		new ElementsUpdateCommand([
			{
				id: node.id,
				type: node.type as GrafcetElementType,
				data: fullModifiedData,
				position: node.position,
				previousData: grafcetElement.data,
				previousPosition: grafcetElement.position,
			},
		]),
	];
};

export const getNodePositionChangeCommands = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	nodeId: string,
): AbstractGrafcetCommand<any>[] => {
	const node = rfInstance.getNode(nodeId) as GrafcetNodeType;
	if (!node) throw new Error("Node not found for id " + nodeId);
	const grafcetElement = grafcet.getElement(node.type, node.id);
	if (!grafcetElement) throw new Error("Grafcet element not found for id " + node.id);
	//Make sure the position is not the same as the previous one, to avoid creating unnecessary commands
	if (grafcetElement.position.x === node.position.x && grafcetElement.position.y === node.position.y) {
		return [];
	}
	return [
		new ElementsUpdateCommand([
			{
				type: node.type,
				id: node.id,
				data: node.data,
				position: node.position,
				previousData: node.data ? grafcetElement.data || {} : undefined,
				previousPosition: node.position ? grafcetElement.position : undefined,
			},
		]),
	];
};

export const getNodeDimensionsChangeCommands = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	nodeId: string,
): AbstractGrafcetCommand<any>[] => {
	const node = rfInstance.getNode(nodeId) as GrafcetNodeType;
	if (!node) throw new Error("Node not found for id " + nodeId);
	const grafcetElement = grafcet.getElement(node.type, node.id);
	if (!grafcetElement) throw new Error("Grafcet element not found for id " + node.id);
	//Make sur the dimensions are not the same as the previous ones, to avoid creating unnecessary commands
	if (
		node.width === undefined ||
		node.height === undefined ||
		(grafcetElement.data.width === node.width && grafcetElement.data.height === node.height)
	) {
		return [];
	}
	return [
		new ElementsUpdateCommand([
			{
				type: node.type,
				id: node.id,
				data: { ...node.data, width: node.width, height: node.height } as any,
				position: node.position,
				previousData: node.data ? grafcetElement.data || {} : undefined,
				previousPosition: node.position
					? grafcetElement.position || {
							x: 0,
							y: 0,
						}
					: undefined,
			},
		]),
	];
};
