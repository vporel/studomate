import Ladder from "../ladder.schema";
import { BlockData } from "../block.schema";
import { CoilData, ContactData, GridPosition } from "../element.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

type ElementChanges = { data?: Partial<ContactData | CoilData | BlockData>; position?: Partial<GridPosition> };

export default class ElementUpdateCommand extends AbstractLadderCommand<{
	elementId: string;
	changes: ElementChanges;
	previousChanges: ElementChanges;
}> {
	getType(): string {
		return "ladder-element-update";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (!ladder.findElement(this.payload.elementId)) return [ladder, false];
		ladder.updateElement(this.payload.elementId, this.payload.changes);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.updateElement(this.payload.elementId, this.payload.previousChanges);
		return ladder;
	}
}
