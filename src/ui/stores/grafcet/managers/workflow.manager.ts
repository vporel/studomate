import Grafcet from "@/schemas/grafcet/grafcet.schema";
import EdgesFactory from "../factories/edges.factory";
import NodesFactory from "../factories/nodes.factory";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
import ElementsAddCommand from "@/schemas/grafcet/commands/elements-add.command";
import Action, {
	ACTION_HANDLE_TARGET_STEP,
} from "@/schemas/grafcet/action.schema";
import Step, {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import Transition, {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import { JUNCTION_TYPES } from "@/schemas/grafcet/element.schema";
import Junction, { JunctionData } from "@/schemas/grafcet/junction.schema";
import { createRandomId } from "@/ids";
import {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { grafcetConnectionFromXYFlowConnectionOrEdge } from "@/ui/utils/grafcet/grafcet-utils";
import {
	applyEdgeChanges,
	applyNodeChanges,
	EdgeChange,
	NodeChange,
	NodeDimensionChange,
	Connection as XYFlowConnection,
} from "@xyflow/react";
import { JunctionNodeType } from "@/ui/components/grafcet/nodes/junctions/JunctionNode";
import ConnectionsCommandsFactory from "../factories/connections-commands.factory";
import ElementsCommandsFactory from "../factories/elements-commands.factory";
import {
	GrafcetStoreGetFunction,
	GrafcetStoreSetFunction,
} from "../grafcet.store";

export default class GrafcetWorkflowManager {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	constructor(
		setStoreState: GrafcetStoreSetFunction,
		getStoreState: GrafcetStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	handleNodesChange(changes: NodeChange<GrafcetNodeType>[]): void {
		const grafcet = this.getStoreState().grafcet;
		//We filter the changes
		//The remove operation is handle by the method onNodesAndEdgesRemove
		const changesToAccept = changes.filter((change) => change.type != "remove");
		//Copie superficielle : seul le nœud jonction réellement modifié est cloné ci-dessous, les
		//autres gardent leur identité. Appelée à chaque frame d'un glisser-déposer : ne pas
		//structuredClone tout le tableau ici.
		let newNodes = [...this.getStoreState().nodes];
		changesToAccept.forEach((change) => {
			const index = newNodes.findIndex((n) => n.id === (change as any).id);
			if (index === -1) return;
			const node = newNodes[index];
			if (
				JUNCTION_TYPES.includes(node.type as (typeof JUNCTION_TYPES)[number])
			) {
				const newData = this.resolveJunctionNodePositionOrDimensionsChange(
					change,
					changesToAccept,
					newNodes,
				);
				newNodes[index] = { ...node, data: newData } as GrafcetNodeType;
			}
		});
		newNodes = applyNodeChanges(changesToAccept, newNodes);
		this.setStoreState(() => ({ nodes: newNodes }));
		//Execute commands on for some changes types
		//The others types are handled by other methods
		//If the changes contain a resizing change with resizing true
		//we don't execute the position change command, because the position will be updated during the resizing and we want to avoid creating unnecessary commands
		if (changesToAccept.some((c) => c.type === "dimensions" && c.resizing))
			return;
		// Les connexions ne stockent que leurs coudes intermédiaires : déplacer ou
		// redimensionner un nœud ne touche que les extrémités (dérivées des handles au rendu),
		// donc rien à repersister ici.
		const { commands } = ElementsCommandsFactory.onNodeChange(
			changesToAccept,
			grafcet,
		);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	addNodes(newNodes: GrafcetNodeType[]): void {
		this.addNodesAndEdges(newNodes, []);
	}

	/**
	 * Ajoute une action à une étape et crée la connexion étape → action.
	 * Sans action déjà liée : la nouvelle action est placée à droite de l'étape (x + 80).
	 * Sinon : collée à droite de l'action la plus à droite de l'étape.
	 */
	addActionToStep(stepId: string): void {
		const grafcet = this.getStoreState().grafcet;
		const step = grafcet.getElementById(stepId);
		if (!step || step.type !== "step") return;

		const existingActions = StepHelper.getActions(stepId, grafcet);
		const position =
			existingActions.length === 0
				? { x: step.position.x + 80, y: step.position.y }
				: (() => {
						const rightmost = existingActions.reduce((a, b) =>
							b.position.x + b.size.width > a.position.x + a.size.width ? b : a,
						);
						return {
							x: rightmost.position.x + rightmost.size.width,
							y: rightmost.position.y,
						};
					})();

		const actionId = createRandomId();
		const connection = new ConnectionBuilder()
			.id(createRandomId())
			.source("step", stepId, STEP_HANDLE_SOURCE_ACTION)
			.target("action", actionId, ACTION_HANDLE_TARGET_STEP)
			.build();

		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsAddCommand([
				{
					type: "action",
					id: actionId,
					data: Action.generateDefaultData(),
					position,
					size: { ...Action.DEFAULT_DIMENSIONS },
				},
			]),
			new ConnectionsAddCommand([connection]),
		]);
	}

	/**
	 * Ajoute une transition sous une étape (y + 50, même x) et crée la connexion étape → transition.
	 * Sans effet si l'étape a déjà un élément aval.
	 */
	addTransitionAfterStep(stepId: string): void {
		const grafcet = this.getStoreState().grafcet;
		const step = grafcet.getElementById(stepId);
		if (
			!step ||
			step.type !== "step" ||
			StepHelper.hasSuccessor(stepId, grafcet)
		)
			return;

		const transitionId = createRandomId();
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsAddCommand([
				{
					type: "transition",
					id: transitionId,
					data: Transition.generateDefaultData(),
					position: { x: step.position.x, y: step.position.y + 50 },
					size: { ...Transition.DEFAULT_DIMENSIONS },
				},
			]),
			new ConnectionsAddCommand([
				new ConnectionBuilder()
					.id(createRandomId())
					.source("step", stepId, STEP_HANDLE_SOURCE_SUCCESSOR)
					.target(
						"transition",
						transitionId,
						TRANSITION_HANDLE_TARGET_PREDECESSOR,
					)
					.build(),
			]),
		]);
	}

	/**
	 * Ajoute une étape sous une transition (y + 50, même x) et crée la connexion transition → étape.
	 * Sans effet si la transition a déjà un élément aval.
	 */
	addStepAfterTransition(transitionId: string): void {
		const grafcet = this.getStoreState().grafcet;
		const transition = grafcet.getElementById(transitionId);
		if (
			!transition ||
			transition.type !== "transition" ||
			TransitionHelper.hasSuccessor(transitionId, grafcet)
		)
			return;

		const stepId = createRandomId();
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsAddCommand([
				{
					type: "step",
					id: stepId,
					data: {
						...Step.generateDefaultData(),
						number: StepHelper.getNextAvailableNumber(grafcet),
					},
					position: { x: transition.position.x, y: transition.position.y + 50 },
					size: { ...Step.DEFAULT_DIMENSIONS },
				},
			]),
			new ConnectionsAddCommand([
				new ConnectionBuilder()
					.id(createRandomId())
					.source(
						"transition",
						transitionId,
						TRANSITION_HANDLE_SOURCE_SUCCESSOR,
					)
					.target("step", stepId, STEP_HANDLE_TARGET_PREDECESSOR)
					.build(),
			]),
		]);
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
			| ((
					prevData: GrafcetNodeType["data"],
			  ) => Partial<GrafcetNodeType["data"]>),
		options?: { edgesToDelete?: string[] },
	): void {
		const grafcet = this.getStoreState().grafcet;
		const { commands, nodeDataToUpdate } =
			ElementsCommandsFactory.onNodeDataChange(
				nodeId,
				newData,
				grafcet,
				this.getStoreState().getDialect(),
			);
		if (!nodeDataToUpdate) return;
		if (options?.edgesToDelete) {
			commands.push(
				...ConnectionsCommandsFactory.onEdgesRemove(
					options.edgesToDelete,
					grafcet,
				).commands,
			);
		}
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	deleteNodes(nodesIds: string[]): void {
		this.deleteNodesAndEdges(nodesIds, []);
	}

	handleNewConnection(connection: XYFlowConnection): void {
		const viewManager = this.getStoreState().viewManager;
		//Seule opération de ce manager à déréférencer réellement l'instance React Flow
		//(géométrie de la connexion). Elle ne peut venir que d'un geste sur le flow monté.
		viewManager.throwErrorIfNotReady();
		const connectionId = createRandomId();
		const grafcetConnection = grafcetConnectionFromXYFlowConnectionOrEdge(
			viewManager.rfInstance!,
			connection,
			connectionId,
		)!;
		this.getStoreState().commandsStackManager.executeOperation([
			new ConnectionsAddCommand([grafcetConnection]),
		]);
	}

	handleEdgesChange(changes: EdgeChange<GrafcetEdgeType>[]): void {
		//We filter the changes
		//The remove operation is handle by the method onNodesAndEdgesRemove
		const changesToAccept = changes.filter((change) => change.type != "remove");
		this.setStoreState(() => ({
			edges: applyEdgeChanges(changesToAccept, this.getStoreState().edges),
		}));
	}

	addEdges(newEdges: GrafcetEdgeType[]): void {
		this.addNodesAndEdges([], newEdges);
	}

	updateEdgeData(
		edgeId: string,
		newData:
			| Partial<GrafcetEdgeType["data"]>
			| ((
					prevData: GrafcetEdgeType["data"],
			  ) => Partial<GrafcetEdgeType["data"]>),
	): void {
		const grafcet = this.getStoreState().grafcet;
		const { commands } = ConnectionsCommandsFactory.onEdgeDataChange(
			edgeId,
			newData,
			grafcet,
			this.getStoreState().edges,
		);
		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	deleteEdges(edgeIds: string[]): void {
		this.deleteNodesAndEdges([], edgeIds);
	}

	addNodesAndEdges(
		newNodes: GrafcetNodeType[],
		newEdges: GrafcetEdgeType[],
	): void {
		const grafcet = this.getStoreState().grafcet;
		const { commands: nodesCommands, nodesToAdd } =
			ElementsCommandsFactory.onNodesAdd(
				newNodes,
				grafcet,
				this.getStoreState().nodes,
			);
		const { commands: edgesCommands } = ConnectionsCommandsFactory.onEdgesAdd(
			newEdges,
			nodesToAdd,
			grafcet,
			this.getStoreState().edges,
		);
		this.getStoreState().commandsStackManager.executeOperation([
			...nodesCommands,
			...edgesCommands,
		]);
	}

	deleteNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		const grafcet = this.getStoreState().grafcet;
		const {
			commands: commandsFromNodes,
			edgesIdsToDelete: list1EdgesIdsToDelete,
		} = ElementsCommandsFactory.onNodesRemove(
			nodesIds,
			grafcet,
			this.getStoreState().nodes,
		);
		const { commands: commandsFromEdges } =
			ConnectionsCommandsFactory.onEdgesRemove(
				edgesIds.filter((id) => !list1EdgesIdsToDelete.includes(id)),
				grafcet,
			);
		this.getStoreState().commandsStackManager.executeOperation([
			...commandsFromNodes,
			...commandsFromEdges,
		]);
	}

	/**
	 * Adopts a grafcet rewritten outside of this store, typically by a project-level command
	 * (renaming a variable rewrites the expressions referencing it).
	 *
	 * Same mechanism as the commands stack: the view is recomputed from the grafcet, which
	 * preserves the selection and the identity of the untouched nodes.
	 *
	 * No command is pushed on the grafcet stack: the operation is already undoable as a
	 * whole through the project command that triggered it.
	 */
	/** Le grafcet actuellement détenu par ce store. */
	getGrafcet(): Grafcet {
		return this.getStoreState().grafcet;
	}

	adoptGrafcet(grafcet: Grafcet): void {
		this.setStoreState((state) => ({
			grafcet,
			nodes: NodesFactory.syncNodes(state.nodes, grafcet),
			edges: EdgesFactory.syncEdges(state.edges, grafcet),
		}));
	}

	//Specific methods for junction management
	deleteJunctionBranch(nodeId: string, branchId: string): void {
		const grafcet = this.getStoreState().grafcet;
		const element = grafcet.getElementById<Junction>(nodeId);
		if (!element) throw new Error("Element with id " + nodeId + " not found");
		if (!JUNCTION_TYPES.includes(element.type as any))
			throw new Error("Element with id " + nodeId + " is not a junction");
		if (element.data.branchesOrder.length <= 2) return;
		const connectionsToDelete = grafcet.getConnectionsByElementIdAndHandle(
			nodeId,
			branchId,
		);
		this.updateNodeData(
			nodeId,
			(prevData) => {
				const newData = structuredClone(prevData) as JunctionData;
				delete newData.branches[branchId];
				newData.branchesOrder = newData.branchesOrder.filter(
					(id: string) => id !== branchId,
				);
				return newData;
			},
			{
				edgesToDelete: connectionsToDelete.map((c) => c.id),
			},
		);
	}

	/**
	 * Une jonction garde ses branches à une position relative constante par rapport au nœud :
	 * un déplacement ou redimensionnement doit donc aussi translater le pivot et les branches,
	 * pas seulement la position du nœud lui-même.
	 */
	private resolveJunctionNodePositionOrDimensionsChange(
		change: NodeChange,
		changes: NodeChange[], //The other changes of the same batch
		nodes: GrafcetNodeType[],
	): JunctionData {
		const node = nodes.find((n) => n.id === (change as any).id) as
			JunctionNodeType | undefined;
		if (!node)
			throw new Error(`Junction node not found for id ${(change as any).id}`);
		if (!node.type!.includes("junction") || change.type !== "position")
			return node.data;
		const dimensionsChange: NodeDimensionChange = changes.find(
			(c) => (c as any).id === (change as any).id && c.type === "dimensions",
		) as NodeDimensionChange;
		if (!dimensionsChange) return node.data;
		//If the position of a junction node is changed
		//and there is also a change of dimensions for the same node,
		//we update the position of the bars in order to keep them in the same relative position to the node position, because during the resizing, the position of the node is updated before the dimensions are updated, so if we don't do this, the bars will be in the wrong position during the resizing
		//Update the branches positions and the pivot position according to the new position of the node
		const positionDelta = node.position.x! - change.position!.x;
		return {
			...node.data,
			pivotPosition: node.data.pivotPosition + positionDelta,
			branches: Object.fromEntries(
				Object.entries(node.data.branches).map(([branchId, branch]) => [
					branchId,
					{ ...branch, position: branch.position + positionDelta },
				]),
			),
		};
	}
}
