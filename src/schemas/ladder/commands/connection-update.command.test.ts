import Connection from "../connection.schema";
import { createContactElement, createCoilElement } from "../element.schema";
import Ladder from "../ladder.schema";
import ConnectionUpdateCommand from "./connection-update.command";

describe("ConnectionUpdateCommand", () => {
	function setup() {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 2, 3);
		ladder.addElements(section.id, [contact, coil]);
		const connection = new Connection(
			"c1",
			{ id: contact.id, type: "contact", handle: "source" },
			{ id: coil.id, type: "coil", handle: "target" },
			{
				points: [
					[1, 2],
					[5, 2],
				],
			},
		);
		ladder.addConnections(section.id, [connection]);
		return { ladder, connection };
	}

	it("met à jour le tracé (points) puis annule vers le précédent", () => {
		const { ladder, connection } = setup();

		const command = new ConnectionUpdateCommand({
			connectionId: connection.id,
			changes: {
				points: [
					[1, 10],
					[5, 10],
				],
			},
			previousChanges: {
				points: connection.data.points.map(([r, c]) => [r, c]),
			},
		});
		command.execute(ladder);
		expect(connection.data.points).toEqual([
			[1, 10],
			[5, 10],
		]);

		command.cancel(ladder);
		expect(connection.data.points).toEqual([
			[1, 2],
			[5, 2],
		]);
	});

	it("échoue si la connexion n'existe pas", () => {
		const ladder = new Ladder("l1", "L");
		const command = new ConnectionUpdateCommand({
			connectionId: "missing",
			changes: {},
			previousChanges: {},
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
