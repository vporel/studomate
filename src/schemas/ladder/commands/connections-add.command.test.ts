import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "../element.schema";
import ConnectionsAddCommand, {
	isConnectionAllowed,
} from "./connections-add.command";

describe("ConnectionsAddCommand", () => {
	it("ajoute une connexion entre deux éléments existants, et l'annulation la retire", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		ladder.addElements(section.id, [contact, coil]);

		const command = new ConnectionsAddCommand({
			sectionId: section.id,
			connections: [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			],
		});
		command.execute(ladder);
		expect(section.connections.map((c) => c.id)).toEqual(["c1"]);

		command.cancel(ladder);
		expect(section.connections).toEqual([]);
	});

	it("échoue si la source est une bobine (toujours terminale)", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const coil = createCoilElement("Q1", "normal", 0, 0);
		const contact = createContactElement("A", "NO", 0, 1);
		ladder.addElements(section.id, [coil, contact]);

		const command = new ConnectionsAddCommand({
			sectionId: section.id,
			connections: [
				new Connection(
					"c1",
					{ id: coil.id, type: "contact", handle: "source" },
					{ id: contact.id, type: "coil", handle: "target" },
				),
			],
		});
		expect(command.execute(ladder)[1]).toBe(false);
		expect(section.connections).toEqual([]);
	});

	it("échoue si la cible n'est pas strictement à droite de la source (empêche les cycles)", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contactA = createContactElement("A", "NO", 0, 1);
		const contactB = createContactElement("B", "NO", 0, 0);
		ladder.addElements(section.id, [contactA, contactB]);

		const command = new ConnectionsAddCommand({
			sectionId: section.id,
			connections: [
				new Connection(
					"c1",
					{ id: contactA.id, type: "contact", handle: "source" },
					{ id: contactB.id, type: "coil", handle: "target" },
				),
			],
		});
		expect(command.execute(ladder)[1]).toBe(false);
		expect(section.connections).toEqual([]);
	});

	it("échoue si la section n'existe pas", () => {
		const ladder = new Ladder("l1", "L");
		const command = new ConnectionsAddCommand({
			sectionId: "missing",
			connections: [
				new Connection(
					"c1",
					{ id: "a", type: "contact", handle: "source" },
					{ id: "b", type: "coil", handle: "target" },
				),
			],
		});
		expect(command.execute(ladder)[1]).toBe(false);
	});
});

describe("isConnectionAllowed", () => {
	it("autorise un contact vers un élément strictement à droite", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		ladder.addElements(section.id, [contact, coil]);

		expect(isConnectionAllowed(section, contact.id, coil.id)).toBe(true);
	});

	it("refuse une borne d'alimentation comme cible", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contactA = createContactElement("A", "NO", 0, 0);
		const railTerminal = createRailTerminalElement(0);
		ladder.addElements(section.id, [contactA, railTerminal]);

		expect(isConnectionAllowed(section, contactA.id, railTerminal.id)).toBe(
			false,
		);
	});

	it("refuse si source ou cible n'existe pas dans la section", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;
		const contact = createContactElement("A", "NO", 0, 0);
		ladder.addElements(section.id, [contact]);

		expect(isConnectionAllowed(section, contact.id, "missing")).toBe(false);
		expect(isConnectionAllowed(section, "missing", contact.id)).toBe(false);
	});
});
