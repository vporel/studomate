import Ladder from "../ladder.schema";
import { LadderElement } from "../element.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

export default class ElementsAddCommand extends AbstractLadderCommand<{
	sectionId: string;
	elements: LadderElement[];
}> {
	getType(): string {
		return "ladder-elements-add";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (!ladder.getSection(this.payload.sectionId)) return [ladder, false];
		ladder.addElements(
			this.payload.sectionId,
			this.payload.elements.map((element) => ({ ...element })),
		);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.removeElements(this.payload.elements.map((element) => element.id));
		return ladder;
	}
}
