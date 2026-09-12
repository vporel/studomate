import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import AbstractCommandsStackManager from "@/ui/stores/shared/abstract-commands-stack.manager";
import LadderEdgesFactory from "../factories/edges.factory";
import LadderNodesFactory from "../factories/nodes.factory";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";

export default class LadderCommandsStackManager extends AbstractCommandsStackManager<Ladder> {
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
	 * que le GRAFCET (`GrafcetWorkflowManager`/`LadderCommandsStackManager`) : exécuter, annuler et rétablir
	 * passent tous par le même chemin, sans code de vue spécifique à chaque type de commande.
	 * Chaque section garde son propre tableau `nodes`/`edges` (un flow indépendant par section,
	 * contrairement au GRAFCET) ; une section supprimée disparaît naturellement de ces deux maps
	 * puisqu'on ne les reconstruit qu'à partir de `ladder.sections`. Les références de vue à une
	 * section (`activeSectionId`, `selectedSectionIds`) sont élaguées si la section a disparu.
	 */
	protected applyDomain(ladder: Ladder): void {
		this.setStoreState((state) => {
			const sectionIds = new Set(ladder.sections.map((s) => s.id));
			const prunedSelected = state.selectedSectionIds.filter((id) =>
				sectionIds.has(id),
			);
			return {
				ladder,
				nodesBySectionId: Object.fromEntries(
					ladder.sections.map((section) => [
						section.id,
						LadderNodesFactory.syncNodes(
							state.nodesBySectionId[section.id] ?? [],
							section,
						),
					]),
				),
				edgesBySectionId: Object.fromEntries(
					ladder.sections.map((section) => [
						section.id,
						LadderEdgesFactory.syncEdges(
							state.edgesBySectionId[section.id] ?? [],
							section,
						),
					]),
				),
				activeSectionId:
					state.activeSectionId && sectionIds.has(state.activeSectionId)
						? state.activeSectionId
						: null,
				selectedSectionIds:
					prunedSelected.length === state.selectedSectionIds.length
						? state.selectedSectionIds
						: prunedSelected,
				hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
				hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
			};
		});
	}
}
