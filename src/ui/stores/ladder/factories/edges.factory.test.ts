import Connection from "@/schemas/ladder/connection.schema";
import { createCoilElement, createContactElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import LadderEdgesFactory from "./edges.factory";

describe("LadderEdgesFactory.syncEdges", () => {
	function sectionWithConnection() {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		section.elements = [contact, coil];
		section.connections = [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })];
		return { section, contact, coil };
	}

	it("getInitialEdges est le cas particulier d'une vue vide", () => {
		const { section } = sectionWithConnection();

		expect(LadderEdgesFactory.getInitialEdges(section)).toEqual(
			LadderEdgesFactory.syncEdges([], section),
		);
	});

	it("conserve l'identité et la sélection d'une arête inchangée", () => {
		const { section } = sectionWithConnection();
		const prev = LadderEdgesFactory.syncEdges([], section).map((e) => ({ ...e, selected: true }));

		const edges = LadderEdgesFactory.syncEdges(prev, section);

		expect(edges[0]).toBe(prev[0]);
		expect(edges[0].selected).toBe(true);
	});

	it("met à jour source/target depuis le domaine sans casser la sélection", () => {
		const { section, coil } = sectionWithConnection();
		const prev = LadderEdgesFactory.syncEdges([], section).map((e) => ({ ...e, selected: true }));
		const otherContact = createContactElement("B", "NO", 0, 0);
		section.elements.push(otherContact);
		section.connections[0] = new Connection("c1", { id: otherContact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" });

		const edges = LadderEdgesFactory.syncEdges(prev, section);

		expect(edges[0].source).toBe(otherContact.id);
		expect(edges[0].selected).toBe(true);
	});

	it("met à jour data.points depuis le domaine (déplacement d'un segment) sans casser la sélection", () => {
		const { section } = sectionWithConnection();
		const prev = LadderEdgesFactory.syncEdges([], section).map((e) => ({ ...e, selected: true }));
		section.connections[0].data.points = [
			[1, 10],
			[5, 10],
		];

		const edges = LadderEdgesFactory.syncEdges(prev, section);

		expect(edges[0]).not.toBe(prev[0]);
		expect(edges[0].data).toEqual({
			points: [
				[1, 10],
				[5, 10],
			],
		});
		expect(edges[0].selected).toBe(true);
	});

	it("retire une arête dont la connexion a disparu, ajoute les nouvelles", () => {
		const { section } = sectionWithConnection();
		const prev = LadderEdgesFactory.syncEdges([], section);
		section.connections = [new Connection("c2", { id: section.elements[0].id, type: "contact", handle: "source" }, { id: section.elements[1].id, type: "coil", handle: "target" })];

		const edges = LadderEdgesFactory.syncEdges(prev, section);

		expect(edges).toHaveLength(1);
		expect(edges[0].id).toBe("c2");
	});
});
