import { ActionData } from "@/schemas/grafcet/action.schema";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
import { JUNCTION_TYPES } from "@/schemas/grafcet/element.schema";
import Junction, { JunctionData } from "@/schemas/grafcet/junction.schema";
import { TransitionData } from "@/schemas/grafcet/transition.schema";
import { createRandomId } from "@/schemas/utils/ids";
import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { grafcetConnectionFromXYFlowConnectionOrEdge } from "@/ui/utils/grafcet/grafcet-utils";
import {
	applyEdgeChanges,
	applyNodeChanges,
	EdgeChange,
	NodeChange,
	Connection as XYFlowConnection,
} from "@xyflow/react";
import { VariablesMnemonicsChanges } from "../../project/managers/variables.manager";
import ConnectionsCommandsFactory from "../factories/connections-commands.factory";
import ElementsCommandsFactory from "../factories/elements-commands.factory";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";
import { junction_onNodeChange as junction_onNodePositionOrDimensionsChange } from "../junction-node-management";

export default class WorkflowManager {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	constructor(setStoreState: GrafcetStoreSetFunction, getStoreState: GrafcetStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	private getNodeUpdater(set: GrafcetStoreSetFunction) {
		return (nodeId: string, updater: (node: any) => any) => {
			set((state) => {
				const newNodes = state.nodes!.map((n) => {
					if (n.id === nodeId) return { ...n, ...updater(n) };
					return n;
				});
				return { nodes: newNodes };
			});
		};
	}

	private getEdgesUpdater(set: GrafcetStoreSetFunction) {
		return (updater: (edges: any[]) => any[]) => {
			set((state) => {
				const newEdges = updater(state.edges!);
				return { edges: newEdges };
			});
		};
	}

	handleNodesChange(changes: NodeChange<GrafcetNodeType>[]): void {
		const viewManager = this.getStoreState().viewManager;
		const grafcet = this.getStoreState().grafcet;
		viewManager.throwErrorIfNotReady();
		//We filter the changes
		//The remove operation is handle by the method onNodesAndEdgesRemove
		const changesToAccept = changes.filter((change) => change.type != "remove");
		let newNodes = structuredClone(this.getStoreState().nodes)!;
		changesToAccept.forEach((change) => {
			const node = newNodes.find((n) => n.id === (change as any).id);
			if (!node) return;
			if (node.type.includes("junction")) {
				const newData = junction_onNodePositionOrDimensionsChange(change, changesToAccept, newNodes);
				newNodes.find((n) => n.id === node.id)!.data = newData;
			}
		});
		newNodes = applyNodeChanges(changesToAccept, newNodes);
		this.setStoreState(() => ({ nodes: newNodes }));
		//Execute commands on for some changes types
		//The others types are handled by other methods
		//If the changes contain a resizing change with resizing true
		//we don't execute the position change command, because the position will be updated during the resizing and we want to avoid creating unnecessary commands
		if (changesToAccept.some((c) => c.type === "dimensions" && c.resizing)) return;
		const { commands, nodesIdsToUpdate } = ElementsCommandsFactory.onNodeChange(
			changesToAccept,
			grafcet,
			viewManager,
		);
		const { commands: edgesCommands, edgesDataToApply: edgesDataToUpdate } =
			ConnectionsCommandsFactory.onNodesMovedOrResized(
				Array.from(nodesIdsToUpdate),
				grafcet,
				viewManager,
			);
		if (edgesDataToUpdate.length > 0) {
			this.setStoreState(({ edges }) => ({
				edges: edges?.map((e) => {
					const edgeToUpdate = edgesDataToUpdate.find((edu) => edu.edgeId === e.id);
					if (edgeToUpdate && edgeToUpdate.newData)
						return { ...e, data: { ...e.data, ...edgeToUpdate.newData } };
					return e;
				}),
			}));
		}
		commands.push(...edgesCommands);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	addNodes(newNodes: GrafcetNodeType[]): void {
		this.addNodesAndEdges(newNodes, []);
	}

	/**
	 *
	 * @param nodeId
	 * @param newData
	 * @param project The calling component should provide the project data in other to perform validations (using project variables for examble)
	 * @returns
	 */
	updateNodeData(
		nodeId: string,
		newData:
			| Partial<GrafcetNodeType["data"]>
			| ((prevData: GrafcetNodeType["data"]) => Partial<GrafcetNodeType["data"]>),
		options?: { saveCommands?: boolean; edgesToDelete?: string[] },
	): void {
		const viewManager = this.getStoreState().viewManager;
		const grafcet = this.getStoreState().grafcet;
		viewManager.throwErrorIfNotReady();
		const { commands, nodeDataToUpdate } = ElementsCommandsFactory.onNodeDataChange(
			nodeId,
			newData,
			grafcet,
			viewManager,
		);
		if (!nodeDataToUpdate) return;
		if (options?.edgesToDelete) {
			commands.push(
				...ConnectionsCommandsFactory.onEdgesRemove(options.edgesToDelete, grafcet, viewManager)
					.commands,
			);
			this.getStoreState().viewManager.removeNodesAndEdges([], options.edgesToDelete);
		}
		const setNode = this.getNodeUpdater(this.setStoreState);
		setNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...nodeDataToUpdate } }) as GrafcetNodeType);
		this.getStoreState().commandsStackManager.executeOperation(commands, {
			saveCommands: options?.saveCommands,
		});
	}

	deleteNodes(nodesIds: string[]): void {
		this.deleteNodesAndEdges(nodesIds, []);
	}

	handleNewConnection(connection: XYFlowConnection): void {
		const viewManager = this.getStoreState().viewManager;
		viewManager.throwErrorIfNotReady();
		const connectionId = createRandomId();
		const grafcetConnection = grafcetConnectionFromXYFlowConnectionOrEdge(
			viewManager.rfInstance!,
			connection,
			connectionId,
		)!;
		viewManager.addNodesAndEdges(null, [
			{ ...connection, type: "custom-edge", id: connectionId, data: grafcetConnection.data },
		]);
		this.getStoreState().commandsStackManager.executeOperation([
			new ConnectionsAddCommand([grafcetConnection]),
		]);
	}

	handleEdgesChange(changes: EdgeChange<GrafcetEdgeType>[]): void {
		const viewManager = this.getStoreState().viewManager;
		viewManager.throwErrorIfNotReady();
		//We filter the changes
		//The remove operation is handle by the method onNodesAndEdgesRemove
		const changesToAccept = changes.filter((change) => change.type != "remove");
		this.setStoreState(() => ({
			edges: applyEdgeChanges(changesToAccept, this.getStoreState().edges!),
		}));
	}

	addEdges(newEdges: GrafcetEdgeType[]): void {
		this.addNodesAndEdges([], newEdges);
	}

	updateEdgeData(
		edgeId: string,
		newData:
			| Partial<GrafcetEdgeType["data"]>
			| ((prevData: GrafcetEdgeType["data"]) => Partial<GrafcetEdgeType["data"]>),
	): void {
		const viewManager = this.getStoreState().viewManager;
		const grafcet = this.getStoreState().grafcet;
		viewManager.throwErrorIfNotReady();
		const { commands, edgeDataToApply: newDataToApply } = ConnectionsCommandsFactory.onEdgeDataChange(
			this.getEdgesUpdater(this.setStoreState),
			edgeId,
			newData,
			grafcet,
			viewManager,
		);
		if (commands.length > 0) {
			this.setStoreState(({ edges }) => ({
				edges: edges!.map((e) =>
					e.id === edgeId ? { ...e, data: { ...e.data, ...(newDataToApply as any) } } : e,
				),
			}));
		}
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	deleteEdges(edgeIds: string[]): void {
		this.deleteNodesAndEdges([], edgeIds);
	}

	addNodesAndEdges(newNodes: GrafcetNodeType[], newEdges: GrafcetEdgeType[]): void {
		const grafcet = this.getStoreState().grafcet;
		const viewManager = this.getStoreState().viewManager;
		viewManager.throwErrorIfNotReady();
		const { commands: nodesCommands, nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
			newNodes,
			grafcet,
			viewManager,
		);
		const { commands: edgesCommands, edgesToAdd } = ConnectionsCommandsFactory.onEdgesAdd(
			newEdges,
			nodesToAdd,
			grafcet,
			viewManager,
		);
		viewManager.addNodesAndEdges(nodesToAdd, edgesToAdd);
		this.getStoreState().commandsStackManager.executeOperation([...nodesCommands, ...edgesCommands]);
	}

	deleteNodesAndEdges(nodesIds: string[], edgesIds: string[], options?: { saveCommands?: boolean }): void {
		const grafcet = this.getStoreState().grafcet;
		const viewManager = this.getStoreState().viewManager;
		viewManager.throwErrorIfNotReady();
		const {
			commands: commandsFromNodes,
			nodesIdsToDelete,
			edgesIdsToDelete: list1EdgesIdsToDelete,
		} = ElementsCommandsFactory.onNodesRemove(nodesIds, grafcet, viewManager);
		const { commands: commandsFromEdges, edgesIdsToDelete: list2EdgesIdsToDelete } =
			ConnectionsCommandsFactory.onEdgesRemove(
				edgesIds.filter((id) => !list1EdgesIdsToDelete.includes(id)),
				grafcet,
				viewManager,
			);
		viewManager.removeNodesAndEdges(nodesIdsToDelete, [
			...list1EdgesIdsToDelete,
			...list2EdgesIdsToDelete,
		]);
		this.getStoreState().commandsStackManager.executeOperation(
			[...commandsFromNodes, ...commandsFromEdges],
			{ saveCommands: options?.saveCommands },
		);
	}

	onVariablesMnemonicsChanges(changes: VariablesMnemonicsChanges): void {
		//Get all the nodes that can be impacted by the change (the ones that have in their data the mnemonic of a variable)
		const nodesNewData: { id: string; newData: any }[] = this.getStoreState()
			.nodes!.map((n) => {
				if (n.type === "transition") {
					const transitionData = n.data as TransitionData;
					const expression = transitionData.expression;
					const impacted =
						expression &&
						Object.values(changes).some(({ oldMnemonic }) => expression.includes(oldMnemonic));
					if (!impacted) return null;
					let newExpression = expression;
					Object.values(changes).forEach(({ oldMnemonic, newMnemonic }) => {
						newExpression = newExpression.split(oldMnemonic).join(newMnemonic);
					});
					return { id: n.id, newData: { expression: newExpression } };
				} else if (n.type === "action") {
					const actionData = n.data as ActionData;
					const expression = actionData.expression;
					const impacted =
						expression &&
						Object.values(changes).some(({ oldMnemonic }) => expression.includes(oldMnemonic));
					if (!impacted) return null;
					let newExpression = expression;
					Object.values(changes).forEach(({ oldMnemonic, newMnemonic }) => {
						newExpression = newExpression.split(oldMnemonic).join(newMnemonic);
					});
					return { id: n.id, newData: { expression: newExpression } };
				}
				return null;
			})
			.filter((n) => n !== null);
		nodesNewData.forEach(({ id, newData }) => {
			//We don't want to save a grafcet command as the variables changes are handled by the project
			this.updateNodeData(id, newData, { saveCommands: false });
		});
	}

	//Specific methods for junction management
	deleteJunctionBranch(nodeId: string, branchId: string): void {
		const grafcet = this.getStoreState().grafcet;
		const element = grafcet.getElementById<Junction>(nodeId);
		if (!element) throw new Error("Element with id " + nodeId + " not found");
		if (!JUNCTION_TYPES.includes(element.type as any))
			throw new Error("Element with id " + nodeId + " is not a junction");
		if (element.data.branchesOrder.length <= 2) return;
		const connectionsToDelete = grafcet.getConnectionsByElementIdAndHandle(nodeId, branchId);
		this.updateNodeData(
			nodeId,
			(prevData) => {
				const newData = structuredClone(prevData) as JunctionData;
				delete newData.branches[branchId];
				newData.branchesOrder = newData.branchesOrder.filter((id: string) => id !== branchId);
				return newData;
			},
			{
				edgesToDelete: connectionsToDelete.map((c) => c.id),
			},
		);
	}
}
