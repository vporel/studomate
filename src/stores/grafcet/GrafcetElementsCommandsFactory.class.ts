import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { deepObjectsComparison } from "@/lib/object";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { NodeChange, NodeDimensionChange, NodePositionChange, ReactFlowInstance } from "@xyflow/react";

export default class GrafcetElementsCommandsFactory {
	rfInstance: ReactFlowInstance;
	grafcet: Grafcet;

	constructor(rfInstance: ReactFlowInstance, grafcet: Grafcet) {
		this.rfInstance = rfInstance;
		this.grafcet = grafcet;
	}

	onNodesAdd(newNodes: GrafcetNodeType[]): {
		commands: AbstractGrafcetCommand<any>[];
		nodesToAdd: GrafcetNodeType[];
	} {
		const existingNodes = this.rfInstance.getNodes();
		const nodesToAdd = newNodes.filter((n) => !existingNodes.find((en) => en.id === n.id));
		const commands = [];
		if (nodesToAdd.length > 0) {
			commands.push(
				new ElementsAddCommand(
					newNodes.map((node) => ({
						type: node.type,
						id: node.id,
						data: node.data,
						position: node.position,
					})),
				),
			);
		}
		return {
			commands,
			nodesToAdd,
		};
	}

	onNodesRemove(nodesIds: string[]): {
		commands: AbstractGrafcetCommand<any>[];
		nodesIdsToDelete: string[];
		edgesIdsToDelete: string[];
	} {
		const connections: GrafcetConnection[] = this.grafcet.connections.filter(
			(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
		);
		const nodesToRemove = nodesIds
			.map((id) => this.rfInstance.getNode(id))
			.filter((n): n is GrafcetNodeType => !!n)
			.map((node) => ({
				type: node.type,
				id: node.id,
				data: node.data,
				position: node.position,
			}));

		const commands: AbstractGrafcetCommand<any>[] = [];
		if (nodesToRemove.length > 0) commands.push(new ElementsRemoveCommand(nodesToRemove));
		if (connections.length > 0) commands.push(new ConnectionsRemoveCommand(connections));
		return {
			commands,
			nodesIdsToDelete: nodesToRemove.map((n) => n.id),
			edgesIdsToDelete: connections.map((c) => c.id),
		};
	}

	onNodeDataChange(
		nodeId: string,
		newData:
			| Partial<GrafcetNodeType["data"]>
			| ((prevData: GrafcetNodeType["data"]) => Partial<GrafcetNodeType["data"]>),
	): { commands: AbstractGrafcetCommand<any>[]; nodeDataToUpdate?: GrafcetNodeType["data"] } {
		const node = this.rfInstance.getNode(nodeId);
		if (!node) return { commands: [] };
		if (typeof newData === "function") {
			const prevData = node.data as any;
			newData = newData(prevData);
		}
		const grafcetElement = this.grafcet.getElement(node.type as GrafcetElementType, node.id);
		if (!grafcetElement) return { commands: [] };
		const fullModifiedData = { ...grafcetElement.data, ...newData };
		const commands = [];
		//Make sure the data is not the same as the previous one, to avoid creating unnecessary commands
		if (!deepObjectsComparison(grafcetElement.data, fullModifiedData)) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						id: node.id,
						type: node.type as GrafcetElementType,
						data: fullModifiedData,
						position: node.position,
						previousData: grafcetElement.data,
						previousPosition: grafcetElement.position,
					}),
				]),
			);
		}
		return { commands, nodeDataToUpdate: fullModifiedData };
	}

	onNodeChange(changes: NodeChange[]): {
		commands: AbstractGrafcetCommand<any>[];
		nodesIdsToUpdate: Set<string>;
	} {
		const commands: AbstractGrafcetCommand<any>[] = [];
		const nodesIdsToUpdate: Set<string> = new Set();
		changes.forEach((change) => {
			switch (change.type) {
				case "position":
					const { commands: positionCommands } = this.getPositionChangeCommands(change);
					commands.push(...positionCommands);
					if (positionCommands.length > 0) nodesIdsToUpdate.add(change.id);
					break;
				case "dimensions":
					const { commands: dimensionCommands } = this.getDimensionsChangeCommands(change);
					commands.push(...dimensionCommands);
					if (dimensionCommands.length > 0) nodesIdsToUpdate.add(change.id);
					break;
			}
		});
		return { commands, nodesIdsToUpdate };
	}

	private getPositionChangeCommands(change: NodePositionChange): {
		commands: AbstractGrafcetCommand<any>[];
	} {
		if (change.dragging || !change.position)
			return {
				commands: [], //No position provided or the node is still being dragged, we will handle the position change on the next event when the dragging is finished
			};
		const node = this.rfInstance.getNode(change.id) as GrafcetNodeType;
		if (!node) throw new Error("Node not found for id " + change.id);
		const grafcetElement = this.grafcet.getElement(node.type, node.id);
		if (!grafcetElement) throw new Error("Grafcet element not found for id " + node.id);
		//Make sure the position is not the same as the previous one, to avoid creating unnecessary commands
		const commands = [];
		if (
			grafcetElement.position.x !== change.position.x ||
			grafcetElement.position.y !== change.position.y
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: node.type,
						id: node.id,
						data: node.data,
						position: change.position,
						previousData: node.data ? grafcetElement.data || {} : undefined,
						previousPosition: node.position ? grafcetElement.position : undefined,
					}),
				]),
			);
		}
		return { commands };
	}

	private getDimensionsChangeCommands(change: NodeDimensionChange): {
		commands: AbstractGrafcetCommand<any>[];
	} {
		if (change.resizing || !change.dimensions)
			return {
				commands: [], //No dimensions provided or currently resizing (we will handle the change at the end of the resizing to avoid creating unnecessary commands during the resizing)
			};
		const node = this.rfInstance.getNode(change.id) as GrafcetNodeType;
		if (!node) throw new Error("Node not found for id " + change.id);
		const grafcetElement = this.grafcet.getElement(node.type, node.id);
		if (!grafcetElement) throw new Error("Grafcet element not found for id " + node.id);
		const commands = [];
		//Make sure the dimensions are not the same as the previous ones, to avoid creating unnecessary commands
		if (
			grafcetElement.data.width !== change.dimensions.width ||
			grafcetElement.data.height !== change.dimensions.height
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: node.type,
						id: node.id,
						data: {
							...node.data,
							width: change.dimensions.width,
							height: change.dimensions.height,
						} as any,
						position: node.position,
						previousData: node.data ? grafcetElement.data || {} : undefined,
						previousPosition: node.position
							? grafcetElement.position || {
									x: 0,
									y: 0,
								}
							: undefined,
					}),
				]),
			);
		}
		return { commands };
	}
}
