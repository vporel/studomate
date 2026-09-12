import Grafcet from "@/schemas/grafcet/grafcet.schema";
import EdgesFactory from "../factories/edges.factory";
import NodesFactory from "../factories/nodes.factory";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
import ElementsAddCommand from "@/schemas/grafcet/commands/elements-add.command";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import computeBranchInsertion from "@/ui/utils/grafcet/junction-branch-insertion";
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
import { normalizeJunctionGeometry } from "@/schemas/grafcet/junction-geometry";
import { createRandomId } from "@/ids";
import {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import {
	GRAFCET_PAGE_DIMENSIONS,
	grafcetConnectionFromXYFlowConnectionOrEdge,
} from "@/ui/utils/grafcet/grafcet-utils";
import {
	applyEdgeChanges,
	applyNodeChanges,
	EdgeChange,
	NodeChange,
	Connection as XYFlowConnection,
} from "@xyflow/react";
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
		const isJunction = (id: string) =>
			JUNCTION_TYPES.includes(
				grafcet.getElementById(id)?.type as (typeof JUNCTION_TYPES)[number],
			);
		//The remove operation is handled by onNodesAndEdgesRemove.
		//Les changements de dimensions d'une jonction sont ignorés : sa largeur est portée par
		//le domaine (pilotée par les branches extrêmes), jamais mesurée par React Flow.
		const changesToAccept = changes.filter(
			(change) =>
				change.type !== "remove" &&
				!(change.type === "dimensions" && isJunction(change.id)),
		);
		const newNodes = applyNodeChanges(changesToAccept, [
			...this.getStoreState().nodes,
		]);
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

	/**
	 * Aperçu du déplacement d'un pin de jonction pendant le glisser : patche la vue
	 * sans toucher le grafcet ni pousser de commande. Le glisser complet est validé
	 * en une seule commande via `updateNodeData` au relâchement de la souris.
	 */
	previewJunctionBarPosition(
		nodeId: string,
		patch: Partial<JunctionData>,
		geometry?: { x?: number; width?: number },
	): void {
		this.setStoreState((state) => ({
			nodes: state.nodes.map((node) =>
				node.id === nodeId
					? ({
							...node,
							data: { ...node.data, ...patch },
							...(geometry?.x != null
								? { position: { ...node.position, x: geometry.x } }
								: {}),
							...(geometry?.width != null ? { width: geometry.width } : {}),
						} as GrafcetNodeType)
					: node,
			),
		}));
	}

	/**
	 * Valide en une commande le redimensionnement d'une jonction piloté par une branche
	 * extrême (voir `resolveExtremeBranchDrag`) : données, position et taille du nœud changent
	 * ensemble (un seul undo).
	 */
	applyJunctionBranchDrag(
		nodeId: string,
		result: {
			branches: JunctionData["branches"];
			pivotPosition: number;
			nodeX: number;
			width: number;
		},
	): void {
		const grafcet = this.getStoreState().grafcet;
		const element = grafcet.getElementById<Junction>(nodeId);
		if (!element) throw new Error("Element with id " + nodeId + " not found");
		if (!JUNCTION_TYPES.includes(element.type as (typeof JUNCTION_TYPES)[number]))
			throw new Error("Element with id " + nodeId + " is not a junction");
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsUpdateCommand([
				{
					type: element.type,
					id: nodeId,
					data: {
						branches: result.branches,
						branchesOrder: element.data.branchesOrder,
						pivotPosition: result.pivotPosition,
					},
					previousData: element.data,
					position: { x: result.nodeX, y: element.position.y },
					previousPosition: element.position,
					size: { width: result.width, height: element.size.height },
					previousSize: element.size,
				},
			]),
		]);
	}

	/**
	 * Insère une branche dans une jonction à la position `insertIndex` de
	 * `branchesOrder`. Données, position et taille du nœud changent en une seule
	 * commande (un seul undo). Sans effet s'il n'y a pas la place.
	 */
	addJunctionBranch(nodeId: string, insertIndex: number): void {
		const grafcet = this.getStoreState().grafcet;
		const element = grafcet.getElementById<Junction>(nodeId);
		if (!element) throw new Error("Element with id " + nodeId + " not found");
		if (!JUNCTION_TYPES.includes(element.type as any))
			throw new Error("Element with id " + nodeId + " is not a junction");
		const pageWidth = GRAFCET_PAGE_DIMENSIONS.width;
		const result = computeBranchInsertion(
			element.data,
			element.size.width,
			element.position.x,
			pageWidth,
			insertIndex,
			createRandomId(),
		);
		if (!result) return;
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsUpdateCommand([
				{
					type: element.type,
					id: nodeId,
					data: {
						branches: result.branches,
						branchesOrder: result.branchesOrder,
						pivotPosition: result.pivotPosition,
					},
					previousData: element.data,
					position: { x: result.nodeX, y: element.position.y },
					previousPosition: element.position,
					size: { width: result.width, height: element.size.height },
					previousSize: element.size,
				},
			]),
		]);
	}

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

		const trimmed = structuredClone(element.data) as JunctionData;
		delete trimmed.branches[branchId];
		trimmed.branchesOrder = trimmed.branchesOrder.filter(
			(id) => id !== branchId,
		);
		// Retirer une branche extrême recale le bord du nœud sur la nouvelle extrémité.
		const geometry = normalizeJunctionGeometry(
			trimmed,
			element.position.x,
			element.size.width,
		);

		this.getStoreState().commandsStackManager.executeOperation([
			new ElementsUpdateCommand([
				{
					type: element.type,
					id: nodeId,
					data: geometry.data,
					previousData: element.data,
					position: { x: geometry.nodeX, y: element.position.y },
					previousPosition: element.position,
					size: { width: geometry.width, height: element.size.height },
					previousSize: element.size,
				},
			]),
			...ConnectionsCommandsFactory.onEdgesRemove(
				connectionsToDelete.map((c) => c.id),
				grafcet,
			).commands,
		]);
	}

}
