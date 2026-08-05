import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import { LadderElement } from "../element.schema";
import Section from "../section.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

export default class SectionRemoveCommand extends AbstractLadderCommand<{
	sectionId: string;
	title: string;
	description: string;
	elements: LadderElement[];
	connections: Connection[];
	index: number;
}> {
	getType(): string {
		return "ladder-section-remove";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		//Un ladder porte toujours au moins une section.
		if (ladder.sections.length <= 1) return [ladder, false];
		if (!ladder.getSection(this.payload.sectionId)) return [ladder, false];
		ladder.deleteSection(this.payload.sectionId);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		const section = new Section(
			this.payload.sectionId,
			this.payload.title,
			this.payload.description,
			this.payload.elements.map((element) => ({ ...element })),
			this.payload.connections.map((connection) => connection.copy()),
		);
		ladder.sections.splice(this.payload.index, 0, section);
		return ladder;
	}
}
