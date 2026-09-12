import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import { createCoilElement, createContactElement } from "../element.schema";
import ElementsRemoveCommand from "./elements-remove.command";

describe("ElementsRemoveCommand", () => {
	it("retire des éléments et leurs connexions, et l'annulation restaure les deux", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		ladder.addElements(section.id, [contact, coil]);
		const connection = new Connection(
			"c1",
			{ id: contact.id, type: "contact", handle: "source" },
			{ id: coil.id, type: "coil", handle: "target" },
		);
		ladder.addConnections(section.id, [connection]);

		const command = new ElementsRemoveCommand({
			elements: [{ sectionId: section.id, element: contact }],
			connections: [{ sectionId: section.id, connection }],
		});
		command.execute(ladder);

		expect(section.elements.map((e) => e.id)).toEqual([coil.id]);
		expect(section.connections).toEqual([]);

		command.cancel(ladder);
		expect(section.elements.map((e) => e.id)).toEqual([coil.id, contact.id]);
		expect(section.connections.map((c) => c.id)).toEqual(["c1"]);
	});

	it("échoue si aucun élément n'est fourni", () => {
		const ladder = new Ladder("l1", "L");
		const command = new ElementsRemoveCommand({
			elements: [],
			connections: [],
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
