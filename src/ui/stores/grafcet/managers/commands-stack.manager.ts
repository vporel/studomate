import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import AbstractCommandsStackManager from "@/ui/stores/shared/abstract-commands-stack.manager";
import EdgesFactory from "../factories/edges.factory";
import NodesFactory from "../factories/nodes.factory";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";

export default class CommandsStackManager extends AbstractCommandsStackManager<Grafcet> {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	/**
	 * The stack is provided by the project, not created here: it must outlive this store,
	 * which is dropped when the grafcet page is closed.
	 */
	constructor(
		setStoreState: GrafcetStoreSetFunction,
		getStoreState: GrafcetStoreGetFunction,
		commandsStack: CommandsStack<Grafcet>,
	) {
		super(commandsStack);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected getDomain(): Grafcet {
		return this.getStoreState().grafcet.copy();
	}

	/**
	 * Adopts the grafcet produced by the commands stack, and realigns the view on it.
	 *
	 * The view is *recomputed* from the grafcet rather than patched by hand. It used to be
	 * mirrored command type by command type, in two ~60-line `instanceof` chains — one for
	 * undo, one for redo — which had to know how to reverse each command's effect on the
	 * nodes and edges. Any asymmetry between the two was a silent bug, and there was one:
	 * undoing a connection removal rebuilt the edge without its `targetHandle` nor its
	 * `data`.
	 *
	 * Recomputing removes the whole class of problem: undo, redo and execute all go through
	 * the same path, and a new command type needs no view code at all.
	 */
	protected applyDomain(grafcet: Grafcet): void {
		this.setStoreState((state) => ({
			grafcet,
			nodes: NodesFactory.syncNodes(state.nodes!, grafcet),
			edges: EdgesFactory.syncEdges(state.edges!, grafcet),
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}
}
