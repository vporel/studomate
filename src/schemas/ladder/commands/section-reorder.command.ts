import Ladder from "../ladder.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

export default class SectionReorderCommand extends AbstractLadderCommand<{
	orderedSectionIds: string[];
	previousOrderedSectionIds: string[];
}> {
	getType(): string {
		return "ladder-section-reorder";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		ladder.reorderSections(this.payload.orderedSectionIds);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.reorderSections(this.payload.previousOrderedSectionIds);
		return ladder;
	}
}
