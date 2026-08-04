import CommandsStack from "@/schemas/commands/commands-stack.schema";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/abstract-grafcet.command";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import EdgesFactory from "../factories/edges.factory";
import NodesFactory from "../factories/nodes.factory";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";

export default class CommandsStackManager {
	private commandsStack: CommandsStack<Grafcet>;
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
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.commandsStack = commandsStack;
	}

	executeOperation(commands: AbstractGrafcetCommand<any>[]): void {
		if (!commands || commands.length === 0) return;
		const newGrafcet = this.commandsStack.execute(commands, this.getStoreState().grafcet.copy());
		this.applyGrafcet(newGrafcet);
	}

	undoOperation(): void {
		const [newGrafcet, commands] = this.commandsStack.undo(this.getStoreState().grafcet.copy());
		if (!commands) return;
		this.applyGrafcet(newGrafcet);
	}

	redoOperation(): void {
		const [newGrafcet, commands] = this.commandsStack.redo(this.getStoreState().grafcet.copy());
		if (!commands) return;
		this.applyGrafcet(newGrafcet);
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
	private applyGrafcet(grafcet: Grafcet): void {
		this.setStoreState((state) => ({
			grafcet,
			nodes: NodesFactory.syncNodes(state.nodes!, grafcet),
			edges: EdgesFactory.syncEdges(state.edges!, grafcet),
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}
}
