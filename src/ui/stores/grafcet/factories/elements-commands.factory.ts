import { deepObjectsComparison } from "@/lib/object";
import GrafcetElementAnalyserFactory from "@/project-analyser/analysers/grafcet/element-analyser.factory";
import Connection from "@/schemas/grafcet//connection.schema";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/abstract-grafcet.command";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/connections-remove.command";
import ElementsAddCommand from "@/schemas/grafcet/commands/elements-add.command";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/elements-remove.command";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import { Dialect } from "@/expression-language/dialect.enum";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import {
	GRAFCET_ELEMENTS_CONFIG,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import {
	NodeChange,
	NodeDimensionChange,
	NodePositionChange,
} from "@xyflow/react";

/** Champs de donnée dont la modification (menu contextuel) est structurelle et ne doit pas être
 * bloquée par le garde-fou d'analyse : le type et le mode d'exécution d'une action. */
const STRUCTURAL_DATA_FIELDS = ["type", "executionMode"];

export default class ElementsCommandsFactory {
	static onNodesAdd(
		newNodes: GrafcetNodeType[],
		grafcet: Grafcet,
		existingNodes: GrafcetNodeType[],
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodesToAdd: GrafcetNodeType[];
	} {
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
						node.data.number = StepHelper.getNextAvailableNumber(grafcet);
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
						size: {
							width:
								node.width ??
								GRAFCET_ELEMENTS_CONFIG[node.type].elementClass
									.DEFAULT_DIMENSIONS.width,
							height:
								node.height ??
								GRAFCET_ELEMENTS_CONFIG[node.type].elementClass
									.DEFAULT_DIMENSIONS.height,
						},
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
		existingNodes: GrafcetNodeType[],
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodesIdsToDelete: string[];
		edgesIdsToDelete: string[];
	} {
		const connections: Connection[] = grafcet.connections.filter(
			(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
		);
		const nodesToRemove = nodesIds
			.map((id) => existingNodes.find((n) => n.id === id))
			.filter((n): n is GrafcetNodeType => !!n)
			.map((node) => ({
				type: node.type,
				id: node.id,
				data: node.data,
				position: node.position,
				size: grafcet.getElementById(node.id)!.size,
			}));

		const commands: AbstractGrafcetCommand<any>[] = [];
		if (nodesToRemove.length > 0)
			commands.push(new ElementsRemoveCommand(nodesToRemove));
		if (connections.length > 0)
			commands.push(new ConnectionsRemoveCommand(connections));
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
			| ((
					prevData: GrafcetNodeType["data"],
			  ) => Partial<GrafcetNodeType["data"]>),

		grafcet: Grafcet,
		dialect: Dialect = Dialect.FR,
	): {
		commands: AbstractGrafcetCommand<any>[];
		nodeDataToUpdate?: GrafcetNodeType["data"];
	} {
		const element = grafcet.getElementById(nodeId);
		if (!element) return { commands: [] };
		const prevData = element.data as any;
		if (typeof newData === "function") newData = newData(prevData);
		// Un changement purement structurel venu d'un menu (type d'action, mode d'exécution) doit
		// toujours s'appliquer : l'analyseur signalera ensuite une éventuelle incohérence avec
		// l'expression conservée. Le garde-fou ne concerne que l'édition du contenu lui-même.
		const isStructuralOnlyChange =
			Object.keys(newData).length > 0 &&
			Object.keys(newData).every((key) =>
				STRUCTURAL_DATA_FIELDS.includes(key),
			);
		newData = element.fixNewDataConsistency(newData, prevData);
		const analyser = GrafcetElementAnalyserFactory.getAnalyser(element.type);
		if (!analyser) return { commands: [] };
		const elementcopy = element.copy();
		elementcopy.updateData(newData);
		if (!isStructuralOnlyChange) {
			const issues = analyser.analyseIsolated(elementcopy, {
				allowEmptyContent: true,
				dialect,
			});
			if (issues.filter((issue) => issue.severity === "error").length > 0)
				return { commands: [] };
		}
		const fullModifiedData = { ...element.data, ...newData };
		const commands = [];
		//Make sure the data is not the same as the previous one, to avoid creating unnecessary commands
		if (!deepObjectsComparison(element.data, fullModifiedData)) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						id: nodeId,
						type: element.type,
						data: fullModifiedData,
						position: element.position,
						previousData: element.data,
						previousPosition: element.position,
					}),
				]),
			);
		}
		return { commands, nodeDataToUpdate: fullModifiedData };
	}

	static onNodeChange(
		changes: NodeChange[],
		grafcet: Grafcet,
	): {
		commands: AbstractGrafcetCommand<any>[];
	} {
		const commands: AbstractGrafcetCommand<any>[] = [];
		changes.forEach((change) => {
			switch (change.type) {
				case "position":
					const { commands: positionCommands } =
						ElementsCommandsFactory.getPositionChangeCommands(change, grafcet);
					commands.push(...positionCommands);
					break;
				case "dimensions":
					const { commands: dimensionCommands } =
						ElementsCommandsFactory.getDimensionsChangeCommands(
							change,
							grafcet,
						);
					commands.push(...dimensionCommands);
					break;
			}
		});
		return { commands };
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
		const element = grafcet.getElementById(change.id);
		if (!element)
			throw new Error("Grafcet element not found for id " + change.id);
		//Make sure the position is not the same as the previous one, to avoid creating unnecessary commands
		const commands = [];
		if (
			element.position.x !== change.position.x ||
			element.position.y !== change.position.y
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: element.type,
						id: element.id,
						data: element.data,
						position: change.position,
						previousData: element.data ? element.data || {} : undefined,
						previousPosition: element.position ? element.position : undefined,
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
		const element = grafcet.getElementById(change.id);
		if (!element)
			throw new Error("Grafcet element not found for id " + change.id);
		const commands = [];
		//Make sure the dimensions are not the same as the previous ones, to avoid creating unnecessary commands
		if (
			element.size.width !== change.dimensions.width ||
			element.size.height !== change.dimensions.height
		) {
			commands.push(
				new ElementsUpdateCommand([
					structuredClone({
						type: element.type,
						id: change.id,
						size: {
							width: change.dimensions.width,
							height: change.dimensions.height,
						},
						previousSize: element.size,
					}),
				]),
			);
		}
		return { commands };
	}
}
