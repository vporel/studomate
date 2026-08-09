import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import AbstractCommandsStackManager from "@/ui/stores/shared/abstract-commands-stack.manager";
import LadderEdgesFactory from "../factories/edges.factory";
import LadderNodesFactory from "../factories/nodes.factory";
import { LadderStoreGetFunction, LadderStoreSetFunction } from "../ladder.store";

export default class CommandsStackManager extends AbstractCommandsStackManager<Ladder> {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	/**
	 * The stack is provided by the project, not created here: it must outlive this store,
	 * which is dropped when the ladder page is closed.
	 */
	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
		commandsStack: CommandsStack<Ladder>,
	) {
		super(commandsStack);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected getDomain(): Ladder {
		return this.getStoreState().ladder.copy();
	}

	/**
	 * Adopte le ladder produit par la pile de commandes, et réaligne la vue dessus.
	 *
	 * La vue est *recalculée* à partir du ladder plutôt que patchée à la main — même principe
	 * que le GRAFCET (`WorkflowManager`/`CommandsStackManager`) : exécuter, annuler et rétablir
	 * passent tous par le même chemin, sans code de vue spécifique à chaque type de commande.
	 * Chaque section garde son propre tableau `nodes`/`edges` (un flow indépendant par section,
	 * contrairement au GRAFCET) ; une section supprimée disparaît naturellement de ces deux maps
	 * puisqu'on ne les reconstruit qu'à partir de `ladder.sections`.
	 */
	protected applyDomain(ladder: Ladder): void {
		this.setStoreState((state) => ({
			ladder,
			nodesBySectionId: Object.fromEntries(
				ladder.sections.map((section) => [
					section.id,
					LadderNodesFactory.syncNodes(state.nodesBySectionId[section.id] ?? [], section),
				]),
			),
			edgesBySectionId: Object.fromEntries(
				ladder.sections.map((section) => [
					section.id,
					LadderEdgesFactory.syncEdges(state.edgesBySectionId[section.id] ?? [], section),
				]),
			),
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}
}
