import Ladder from "../ladder.schema";
import { createContactElement } from "../element.schema";
import SectionRemoveCommand from "./section-remove.command";

describe("SectionRemoveCommand", () => {
	it("retire une section avec ses éléments/connexions, et l'annulation les restaure", () => {
		const ladder = new Ladder("l1", "L");
		const second = ladder.createSection("B", "Desc B");
		const contact = createContactElement("A", "NO", 0, 0);
		ladder.addElements(second.id, [contact]);

		const command = new SectionRemoveCommand({
			sectionId: second.id,
			title: "B",
			description: "Desc B",
			elements: [contact],
			connections: [],
			index: 1,
		});
		command.execute(ladder);
		expect(ladder.getSection(second.id)).toBeUndefined();

		command.cancel(ladder);
		const restored = ladder.getSection(second.id)!;
		expect(restored.title).toBe("B");
		expect(restored.elements).toEqual([contact]);
		expect(ladder.sections[1].id).toBe(second.id);
	});

	it("échoue s'il ne reste qu'une seule section", () => {
		const ladder = new Ladder("l1", "L");
		const [only] = ladder.sections;
		const command = new SectionRemoveCommand({
			sectionId: only.id,
			title: only.title,
			description: only.description,
			elements: [],
			connections: [],
			index: 0,
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
