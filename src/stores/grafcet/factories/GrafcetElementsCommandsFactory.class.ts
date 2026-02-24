import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { deepObjectsComparison } from "@/lib/object";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import StepsHelper from "@/schemas/grafcet/helpers/StepsHelper.class";
import ElementDataValidatorFactory from "@/schemas/grafcet/validators/ElementDataValidatorFactory";
import Project from "@/schemas/project/Project.class";
import { NodeChange, NodeDimensionChange, NodePositionChange } from "@xyflow/react";
import ViewManager from "../managers/ViewManager";

export default class GrafcetElementsCommandsFactory {
	static onNodesAdd(
		newNodes: GrafcetNodeType[],
		grafcet: Grafcet,
		viewManager: ViewManager,
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodesToAdd: GrafcetNodeType[];
	} {
		const existingNodes = viewManager.getNodes();
		const nodesToAdd = newNodes
			.filter(
				(n) =>
					!existingNodes.find((en) => en.id === n.id) &&
					(n.type !== "step" ||
						!n.data.initial ||
						!existingNodes.find((en) => en.type === "step" && en.data.initial)),
			)
			.map((node) => {
				if (node.type === "step") {
					//If no number is provided for the step, we will assign it the next available number
					if (node.data.number === undefined || node.data.number === "") {
						node.data.number = StepsHelper.getNextAvailableNumber(grafcet);
					}
				}
				return node;
			});
		const commands = [];
		if (nodesToAdd.length > 0) {
			commands.push(
				new ElementsAddCommand(
					nodesToAdd.map((node) => ({
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

	static onNodesRemove(
		nodesIds: string[],
		grafcet: Grafcet,
		viewManager: ViewManager,
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodesIdsToDelete: string[];
		edgesIdsToDelete: string[];
	} {
		const connections: GrafcetConnection[] = grafcet.connections.filter(
			(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
		);
		const nodesToRemove = nodesIds
			.map((id) => viewManager.getNode(id))
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

	static onNodeDataChange(
		nodeId: string,
		newData:
			| Partial<GrafcetNodeType["data"]>
			| ((prevData: GrafcetNodeType["data"]) => Partial<GrafcetNodeType["data"]>),

		grafcet: Grafcet,
		viewManager: ViewManager,
		project: Project,
	): { commands: AbstractGrafcetCommand<any>[]; nodeDataToUpdate?: GrafcetNodeType["data"] } {
		const grafcetElement = grafcet.getElementById(nodeId);
		if (!grafcetElement) return { commands: [] };
		const prevData = grafcetElement.data as any;
		if (typeof newData === "function") newData = newData(prevData);
		newData = grafcetElement.fixNewDataConsistency(newData);
		const validator = ElementDataValidatorFactory.getValidatorForElementType(grafcetElement.type);
		const validationErrors = validator.validateData(nodeId, newData, grafcet, {
			projectData: { variables: project.variables },
		});
		if (validationErrors.length > 0) return { commands: [] };
		const fullModifiedData = { ...grafcetElement.data, ...newData };
		const commands = [];
		//Make sure the data is not the same as the previous one, to avoid creating unnecessary commands
		if (!deepObjectsComparison(grafcetElement.data, fullModifiedData)) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						id: nodeId,
						type: grafcetElement.type,
						data: fullModifiedData,
						position: grafcetElement.position,
						previousData: grafcetElement.data,
						previousPosition: grafcetElement.position,
					}),
				]),
			);
		}
		return { commands, nodeDataToUpdate: fullModifiedData };
	}

	static onNodeChange(
		changes: NodeChange[],
		grafcet: Grafcet,
		viewManager: ViewManager,
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodesIdsToUpdate: Set<string>;
	} {
		const commands: AbstractGrafcetCommand<any>[] = [];
		const nodesIdsToUpdate: Set<string> = new Set();
		changes.forEach((change) => {
			switch (change.type) {
				case "position":
					const { commands: positionCommands } =
						GrafcetElementsCommandsFactory.getPositionChangeCommands(change, grafcet);
					commands.push(...positionCommands);
					if (positionCommands.length > 0) nodesIdsToUpdate.add(change.id);
					break;
				case "dimensions":
					const { commands: dimensionCommands } =
						GrafcetElementsCommandsFactory.getDimensionsChangeCommands(change, grafcet);
					commands.push(...dimensionCommands);
					if (dimensionCommands.length > 0) nodesIdsToUpdate.add(change.id);
					break;
			}
		});
		return { commands, nodesIdsToUpdate };
	}

	private static getPositionChangeCommands(
		change: NodePositionChange,
		grafcet: Grafcet,
	): {
		commands: AbstractGrafcetCommand<any>[];
	} {
		if (change.dragging || !change.position)
			return {
				commands: [], //No position provided or the node is still being dragged, we will handle the position change on the next event when the dragging is finished
			};
		const grafcetElement = grafcet.getElementById(change.id);
		if (!grafcetElement) throw new Error("Grafcet element not found for id " + change.id);
		//Make sure the position is not the same as the previous one, to avoid creating unnecessary commands
		const commands = [];
		if (
			grafcetElement.position.x !== change.position.x ||
			grafcetElement.position.y !== change.position.y
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: grafcetElement.type,
						id: grafcetElement.id,
						data: grafcetElement.data,
						position: change.position,
						previousData: grafcetElement.data ? grafcetElement.data || {} : undefined,
						previousPosition: grafcetElement.position ? grafcetElement.position : undefined,
					}),
				]),
			);
		}
		return { commands };
	}

	private static getDimensionsChangeCommands(
		change: NodeDimensionChange,
		grafcet: Grafcet,
	): {
		commands: AbstractGrafcetCommand<any>[];
	} {
		if (change.resizing || !change.dimensions)
			return {
				commands: [], //No dimensions provided or currently resizing (we will handle the change at the end of the resizing to avoid creating unnecessary commands during the resizing)
			};
		const grafcetElement = grafcet.getElementById(change.id);
		if (!grafcetElement) throw new Error("Grafcet element not found for id " + change.id);
		const commands = [];
		//Make sure the dimensions are not the same as the previous ones, to avoid creating unnecessary commands
		if (
			grafcetElement.data.width !== change.dimensions.width ||
			grafcetElement.data.height !== change.dimensions.height
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: grafcetElement.type,
						id: change.id,
						data: {
							...grafcetElement.data,
							width: change.dimensions.width,
							height: change.dimensions.height,
						} as any,
						position: grafcetElement.position,
						previousData: grafcetElement.data ? grafcetElement.data || {} : undefined,
						previousPosition: grafcetElement.position || {
							x: 0,
							y: 0,
						},
					}),
				]),
			);
		}
		return { commands };
	}
}
