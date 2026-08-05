import AbstractCommand from "@/schemas/commands/abstract.command";
import CommandsStack from "@/schemas/commands/commands-stack.schema";

/**
 * Gestionnaire de pile de commandes générique — factorise la logique execute/undo/redo,
 * strictement identique entre les stores Grafcet et Ladder.
 *
 * Seule `applyDomain` est abstraite : elle est chargée de propager le domaine résultant
 * dans le store (recompute des nodes/edges) et de mettre à jour `hasCommandsToUndo/Redo`.
 */
export default abstract class AbstractCommandsStackManager<TDomain> {
	protected commandsStack: CommandsStack<TDomain>;

	constructor(commandsStack: CommandsStack<TDomain>) {
		this.commandsStack = commandsStack;
	}

	executeOperation(commands: AbstractCommand<TDomain, any>[]): void {
		if (!commands || commands.length === 0) return;
		const newDomain = this.commandsStack.execute(commands, this.getDomain());
		this.applyDomain(newDomain);
	}

	undoOperation(): void {
		const [newDomain, commands] = this.commandsStack.undo(this.getDomain());
		if (!commands) return;
		this.applyDomain(newDomain);
	}

	redoOperation(): void {
		const [newDomain, commands] = this.commandsStack.redo(this.getDomain());
		if (!commands) return;
		this.applyDomain(newDomain);
	}

	/** Retourne une copie du domaine courant depuis le store. */
	protected abstract getDomain(): TDomain;

	/**
	 * Adopte le domaine produit par la pile et réaligne la vue dessus.
	 * Doit aussi mettre à jour `hasCommandsToUndo` / `hasCommandsToRedo`.
	 */
	protected abstract applyDomain(domain: TDomain): void;
}
