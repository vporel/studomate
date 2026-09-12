import Ladder from "../ladder.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

export default class SectionUpdateCommand extends AbstractLadderCommand<{
	sectionId: string;
	title?: string;
	description?: string;
	previousTitle?: string;
	previousDescription?: string;
}> {
	getType(): string {
		return "ladder-section-update";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		const section = ladder.getSection(this.payload.sectionId);
		if (!section) return [ladder, false];
		if (this.payload.title !== undefined)
			ladder.renameSection(this.payload.sectionId, this.payload.title);
		if (this.payload.description !== undefined) {
			ladder.setSectionDescription(
				this.payload.sectionId,
				this.payload.description,
			);
		}
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		if (this.payload.previousTitle !== undefined) {
			ladder.renameSection(this.payload.sectionId, this.payload.previousTitle);
		}
		if (this.payload.previousDescription !== undefined) {
			ladder.setSectionDescription(
				this.payload.sectionId,
				this.payload.previousDescription,
			);
		}
		return ladder;
	}
}
