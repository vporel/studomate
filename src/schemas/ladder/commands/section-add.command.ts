import Ladder from "../ladder.schema";
import Section from "../section.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

export default class SectionAddCommand extends AbstractLadderCommand<{
	sectionId: string;
	title: string;
	description: string;
}> {
	getType(): string {
		return "ladder-section-add";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (ladder.getSection(this.payload.sectionId)) return [ladder, false];
		const section = new Section(this.payload.sectionId, this.payload.title, this.payload.description);
		ladder.sections.push(section);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.deleteSection(this.payload.sectionId);
		return ladder;
	}
}
