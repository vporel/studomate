import Ladder from "../ladder.schema";
import { createContactElement } from "../element.schema";
import ElementUpdateCommand from "./element-update.command";

describe("ElementUpdateCommand", () => {
	it("met à jour puis annule vers les données précédentes", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		ladder.addElements(section.id, [contact]);

		const command = new ElementUpdateCommand({
			elementId: contact.id,
			changes: { data: { mode: "NF", variable: "B" } },
			previousChanges: { data: { mode: "NO", variable: "A" } },
		});
		command.execute(ladder);
		expect(contact.data.mode).toBe("NF");
		expect(contact.data.variable).toBe("B");

		command.cancel(ladder);
		expect(contact.data.mode).toBe("NO");
		expect(contact.data.variable).toBe("A");
	});

	it("met à jour la position (row/col), pour le déplacement d'un élément existant", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		ladder.addElements(section.id, [contact]);

		const command = new ElementUpdateCommand({
			elementId: contact.id,
			changes: { position: { row: 2, col: 3 } },
			previousChanges: { position: { row: 0, col: 0 } },
		});
		command.execute(ladder);
		expect(contact.position.row).toBe(2);
		expect(contact.position.col).toBe(3);

		command.cancel(ladder);
		expect(contact.position.row).toBe(0);
		expect(contact.position.col).toBe(0);
	});

	it("échoue si l'élément n'existe pas", () => {
		const ladder = new Ladder("l1", "L");
		const command = new ElementUpdateCommand({ elementId: "missing", changes: {}, previousChanges: {} });
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
