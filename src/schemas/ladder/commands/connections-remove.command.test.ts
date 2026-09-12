import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import { createCoilElement, createContactElement } from "../element.schema";
import ConnectionsRemoveCommand from "./connections-remove.command";

describe("ConnectionsRemoveCommand", () => {
	it("retire une connexion, et l'annulation la restaure", () => {
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

		const command = new ConnectionsRemoveCommand({
			sectionId: section.id,
			connections: [connection],
		});
		command.execute(ladder);
		expect(section.connections).toEqual([]);

		command.cancel(ladder);
		expect(section.connections.map((c) => c.id)).toEqual(["c1"]);
	});

	it("échoue si aucune connexion n'est fournie", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const command = new ConnectionsRemoveCommand({
			sectionId: section.id,
			connections: [],
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
