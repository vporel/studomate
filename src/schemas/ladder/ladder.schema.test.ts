import Connection from "./connection.schema";
import Ladder from "./ladder.schema";
import { createCoilElement, createContactElement } from "./element.schema";
import Section from "./section.schema";

describe("Ladder", () => {
	it("porte toujours au moins une section à la création", () => {
		const ladder = new Ladder("l1", "Mon ladder");
		expect(ladder.sections).toHaveLength(1);
	});

	describe("sections", () => {
		it("createSection ajoute une section, getSection la retrouve", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const section = ladder.createSection("Départ moteur", "Commande principale");

			expect(ladder.sections).toHaveLength(2);
			expect(ladder.getSection(section.id)).toBe(section);
			expect(section.title).toBe("Départ moteur");
			expect(section.description).toBe("Commande principale");
		});

		it("renameSection / setSectionDescription mettent à jour la section ciblée", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [initial] = ladder.sections;

			ladder.renameSection(initial.id, "Nouveau titre");
			ladder.setSectionDescription(initial.id, "Nouvelle description");

			expect(initial.title).toBe("Nouveau titre");
			expect(initial.description).toBe("Nouvelle description");
		});

		it("deleteSection refuse de supprimer la dernière section", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [onlySection] = ladder.sections;

			ladder.deleteSection(onlySection.id);

			expect(ladder.sections).toHaveLength(1);
		});

		it("deleteSection supprime une section s'il en reste au moins une", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const second = ladder.createSection();

			ladder.deleteSection(second.id);

			expect(ladder.sections).toHaveLength(1);
			expect(ladder.getSection(second.id)).toBeUndefined();
		});

		it("reorderSections réordonne, et n'oublie jamais une section absente de la liste fournie", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [first] = ladder.sections;
			const second = ladder.createSection("B");
			const third = ladder.createSection("C");

			ladder.reorderSections([third.id, first.id]);

			expect(ladder.sections.map((s) => s.id)).toEqual([third.id, first.id, second.id]);
		});
	});

	describe("elements", () => {
		it("addElements ajoute des éléments à une section, findElement les retrouve", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);

			ladder.addElements(section.id, [contact]);

			expect(section.elements).toEqual([contact]);
			expect(ladder.findElement(contact.id)).toEqual({ section, element: contact });
		});

		it("updateElement met à jour variable/mode d'un élément existant", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			ladder.updateElement(contact.id, { data: { variable: "B", mode: "NF" } });

			expect(contact.data.variable).toBe("B");
			expect(contact.data.mode).toBe("NF");
		});

		it("removeElements retire les éléments et, en cascade, toute connexion qui les touche", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })]);

			ladder.removeElements([contact.id]);

			expect(section.elements.map((e) => e.id)).toEqual([coil.id]);
			expect(section.connections).toEqual([]);
		});

		it("getAllElements aplatit les éléments de toutes les sections", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [sectionA] = ladder.sections;
			const sectionB = ladder.createSection("B");
			const contactA = createContactElement("A", "NO", 0, 0);
			const contactB = createContactElement("B", "NO", 0, 0);
			ladder.addElements(sectionA.id, [contactA]);
			ladder.addElements(sectionB.id, [contactB]);

			expect(ladder.getAllElements()).toEqual([contactA, contactB]);
		});
	});

	describe("connections", () => {
		it("addConnections relie deux éléments existants, removeConnections les délie", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);

			ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })]);
			expect(section.connections.map((c) => c.id)).toEqual(["c1"]);

			ladder.removeConnections(section.id, [{ sourceId: contact.id, targetId: coil.id }]);
			expect(section.connections).toEqual([]);
		});

		it("addConnections lève si source ou target n'existe pas dans la section", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			expect(() => ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: "missing", type: "coil", handle: "target" })])).toThrow();
		});

		it("getAllConnections aplatit les connexions de toutes les sections, avec leur sectionId", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })]);

			expect(ladder.getAllConnections()).toEqual([
				{ sectionId: section.id, connection: expect.objectContaining({ id: "c1" }) },
			]);
		});
	});

	describe("copy", () => {
		it("copie en profondeur sections, éléments et connexions", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })]);

			const copy = ladder.copy();
			const copiedSection = copy.sections[0];

			expect(copy).not.toBe(ladder);
			expect(copiedSection).not.toBe(section);
			expect(copiedSection.elements).not.toBe(section.elements);
			expect(copiedSection.elements).toEqual(section.elements);
			expect(copiedSection.connections[0]).not.toBe(section.connections[0]);
			expect(copiedSection.connections).toEqual(section.connections);
		});
		});

	describe("createFromJSON", () => {
		it("reconstruit un ladder identique après un aller-retour JSON", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NF", 0, 0);
			const coil = createCoilElement("Q1", "set", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })]);
			ladder.createSection("Autre section", "Description libre");

			const restored = Ladder.createFromJSON(JSON.stringify(ladder));

			expect(restored).toBeInstanceOf(Ladder);
			expect(restored.type).toBe("ladder");
			expect(restored.sections).toHaveLength(2);
			expect(restored.sections[0]).toBeInstanceOf(Section);
			expect(restored.sections[0].elements).toEqual([contact, coil]);
			expect(restored.sections[0].connections[0]).toBeInstanceOf(Connection);
			expect(restored.sections[0].connections[0].id).toBe("c1");
		});

		it("reconstruit une section sans élément ni connexion", () => {
			const ladder = new Ladder("l1", "Mon ladder");

			const restored = Ladder.createFromJSON(JSON.stringify(ladder));

			expect(restored.sections[0].elements).toEqual([]);
			expect(restored.sections[0].connections).toEqual([]);
		});
	});
});
