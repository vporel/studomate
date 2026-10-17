import Ladder from "@/schemas/ladder/ladder.schema";
import LadderEdgesFactory from "./factories/edges.factory";
import LadderNodesFactory from "./factories/nodes.factory";
import { LadderStoreState } from "./ladder.store";

type LadderViewState = Pick<
	LadderStoreState,
	| "ladder"
	| "nodesBySectionId"
	| "edgesBySectionId"
	| "activeSectionId"
	| "selectedSectionIds"
>;

/**
 * Recomputes the view state from a ladder instead of patching it per command type, so that
 * execute, undo, redo and external rewrites all go through the same path.
 *
 * Each section keeps its own `nodes`/`edges` array (an independent flow per section); a removed
 * section disappears from both maps since they are rebuilt from `ladder.sections` only.
 * View references to a section (`activeSectionId`, `selectedSectionIds`) are pruned when the
 * section is gone.
 */
export default function syncLadderViewState(
	state: Omit<LadderViewState, "ladder">,
	ladder: Ladder,
): LadderViewState {
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
	};
}
