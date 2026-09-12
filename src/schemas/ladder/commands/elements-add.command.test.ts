import Ladder from "../ladder.schema";
import { createContactElement } from "../element.schema";
import ElementsAddCommand from "./elements-add.command";

describe("ElementsAddCommand", () => {
	it("ajoute des éléments à une section, et l'annulation les retire", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);

		const command = new ElementsAddCommand({
			sectionId: section.id,
			elements: [contact],
		});
		command.execute(ladder);

		expect(section.elements).toEqual([contact]);

		command.cancel(ladder);
		expect(section.elements).toEqual([]);
	});

	it("échoue si la section n'existe pas", () => {
		const ladder = new Ladder("l1", "L");
		const command = new ElementsAddCommand({
			sectionId: "missing",
			elements: [createContactElement("A", "NO", 0, 0)],
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
