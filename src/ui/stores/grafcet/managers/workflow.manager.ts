import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
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
import ConnectionsCommandsFactory from "../factories/connections-commands.factory";
import ElementsCommandsFactory from "../factories/elements-commands.factory";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";
import { junction_onNodeChange } from "../junction-node-management";

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
		const nodes = this.getStoreState().nodes;
		//We filter the changes
		//The remove operation is handle by the method onNodesAndEdgesRemove
		const changesToAccept = changes.filter((change) => change.type != "remove");
		changesToAccept.forEach((change) => {
			const node = nodes.find((n) => n.id === (change as any).id);
			if (!node) return;
			if (node.type.includes("junction")) {
				junction_onNodeChange(
					change,
					changesToAccept,
					nodes,
					this.getNodeUpdater(this.setStoreState),
				);
			}
		});
		this.setStoreState(() => ({
			nodes: applyNodeChanges(changesToAccept, nodes),
		}));
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
		const setNode = this.getNodeUpdater(this.setStoreState);
		setNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...nodeDataToUpdate } }) as GrafcetNodeType);
		this.getStoreState().commandsStackManager.executeOperation(commands);
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

	deleteNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
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

		this.getStoreState().commandsStackManager.executeOperation([
			...commandsFromNodes,
			...commandsFromEdges,
		]);
	}
}
