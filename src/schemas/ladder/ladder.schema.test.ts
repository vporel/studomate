import Connection from "./connection.schema";
import Ladder from "./ladder.schema";
import { createCoilElement, createContactElement } from "./element.schema";
import {
	createUserProgramBlockElement,
	createArithmeticBlockElement,
	createCompareBlockElement,
} from "./block.schema";
import { createTimerBlockElement } from "./function-blocks/timer.schema";
import { createCounterBlockElement } from "./function-blocks/counter.schema";
import Section from "./section.schema";

describe("Ladder", () => {
	it("porte toujours au moins une section à la création", () => {
		const ladder = new Ladder("l1", "Mon ladder");
		expect(ladder.sections).toHaveLength(1);
	});

	it("a le rôle 'standard' par défaut, sauf si spécifié autrement", () => {
		const ladder = new Ladder("l1", "Mon ladder");
		expect(ladder.role).toBe("standard");

		const main = new Ladder("l2", "Main", undefined, "main");
		expect(main.role).toBe("main");
	});

	describe("sections", () => {
		it("createSection ajoute une section, getSection la retrouve", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const section = ladder.createSection(
				"Départ moteur",
				"Commande principale",
			);

			expect(ladder.sections).toHaveLength(2);
			expect(ladder.getSection(section.id)).toBe(section);
			expect(section.title).toBe("Départ moteur");
			expect(section.description).toBe("Commande principale");
		});

		it("getSectionsInOrder suit l'ordre du ladder quel que soit l'ordre des ids", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const a = ladder.createSection("A");
			const b = ladder.createSection("B");
			const c = ladder.createSection("C");

			expect(ladder.getSectionsInOrder([c.id, a.id, b.id])).toEqual([a, b, c]);
		});

		it("getSectionsInOrder ignore les ids inconnus et renvoie [] pour une liste vide", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const a = ladder.createSection("A");

			expect(ladder.getSectionsInOrder(["inconnu", a.id])).toEqual([a]);
			expect(ladder.getSectionsInOrder([])).toEqual([]);
		});

		it("getSectionsInOrder ne duplique pas une section dont l'id est répété", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const a = ladder.createSection("A");

			expect(ladder.getSectionsInOrder([a.id, a.id])).toEqual([a]);
		});

		it("renameSection / setSectionDescription mettent à jour la section ciblée", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [initial] = ladder.sections;

			ladder.renameSection(initial.id, "Nouveau titre");
			ladder.setSectionDescription(initial.id, "Nouvelle description");

			expect(initial.title).toBe("Nouveau titre");
			expect(initial.description).toBe("Nouvelle description");
		});

		it("canDeleteSection est faux avec une seule section et vrai dès qu'il y en a deux", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			expect(ladder.canDeleteSection()).toBe(false);

			ladder.createSection();

			expect(ladder.canDeleteSection()).toBe(true);
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

			expect(ladder.sections.map((s) => s.id)).toEqual([
				third.id,
				first.id,
				second.id,
			]);
		});
	});

	it("is never skipped, even empty", () => {
		expect(new Ladder("l1", "Mon ladder").isSkippedWhenEmpty()).toBe(false);
	});

	describe("isEmpty", () => {
		it("est vrai pour un ladder neuf, dont l'unique section n'a aucun élément", () => {
			expect(new Ladder("l1", "Mon ladder").isEmpty()).toBe(true);
		});

		it("reste vrai avec plusieurs sections toutes vides", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			ladder.createSection("Section 2");

			expect(ladder.isEmpty()).toBe(true);
		});

		it("est faux dès qu'une section porte un élément", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const section = ladder.createSection("Section 2");
			ladder.addElements(section.id, [createContactElement("A", "NO", 0, 0)]);

			expect(ladder.isEmpty()).toBe(false);
		});
	});

	describe("elements", () => {
		it("addElements ajoute des éléments à une section, findElement les retrouve", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);

			ladder.addElements(section.id, [contact]);

			expect(section.elements).toEqual([contact]);
			expect(ladder.findElement(contact.id)).toEqual({
				section,
				element: contact,
			});
		});

		it("updateElement met à jour variable/type d'un élément existant", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			ladder.updateElement(contact.id, { data: { variable: "B", type: "NF" } });

			expect(contact.data.variable).toBe("B");
			expect(contact.data.type).toBe("NF");
		});

		it("removeElements retire les éléments et, en cascade, toute connexion qui les touche", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			]);

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

		describe("getBlockNames", () => {
			const timer = (name: string, row = 0) =>
				createTimerBlockElement(
					{ name, timerType: "TON", pt: "T#1s", et: "" },
					row,
					0,
				);
			const counter = (name: string, row = 0) =>
				createCounterBlockElement(
					{ name, counterType: "CTU", control: "CU", pv: "10" },
					row,
					0,
				);

			it("renvoie un ensemble vide pour un ladder vide", () => {
				expect(new Ladder("l1", "L").getBlockNames().size).toBe(0);
			});

			it("rassemble les noms de timers et compteurs de toutes les sections", () => {
				const ladder = new Ladder("l1", "L");
				const [sectionA] = ladder.sections;
				const sectionB = ladder.createSection("B");
				ladder.addElements(sectionA.id, [timer("Tempo"), counter("Cpt", 1)]);
				ladder.addElements(sectionB.id, [timer("Tempo2")]);

				expect(ladder.getBlockNames()).toEqual(
					new Set(["Tempo", "Cpt", "Tempo2"]),
				);
			});

			it("ignore les blocs sans nom", () => {
				const ladder = new Ladder("l1", "L");
				ladder.addElements(ladder.sections[0].id, [
					timer(""),
					counter("Cpt", 1),
				]);

				expect(ladder.getBlockNames()).toEqual(new Set(["Cpt"]));
			});

			it("ignore les éléments non-blocs et les autres types de bloc", () => {
				const ladder = new Ladder("l1", "L");
				ladder.addElements(ladder.sections[0].id, [
					createContactElement("A", "NO", 0, 0),
					createCoilElement("B", "normal", 1, 0),
					createUserProgramBlockElement("prog1", 2, 0),
					createCompareBlockElement(3, 0),
				]);

				expect(ladder.getBlockNames().size).toBe(0);
			});
		});
	});

	describe("getBlockElements", () => {
		it("renvoie les blocs du type demandé, toutes sections confondues", () => {
			const ladder = new Ladder("l1", "L");
			const sectionB = ladder.createSection("B");
			const timerA = createTimerBlockElement(
				{ name: "TA", timerType: "TON", pt: "T#1s" },
				0,
				0,
			);
			const timerB = createTimerBlockElement(
				{ name: "TB", timerType: "TON", pt: "T#1s" },
				0,
				0,
			);
			ladder.addElements(ladder.sections[0].id, [
				timerA,
				createCounterBlockElement(
					{ name: "C", counterType: "CTU", control: "CU", pv: "10" },
					1,
					0,
				),
				createUserProgramBlockElement("prog1", 2, 0),
				createContactElement("A", "NO", 3, 0),
			]);
			ladder.addElements(sectionB.id, [timerB]);

			expect(ladder.getBlockElements("timer")).toEqual([timerA, timerB]);
			expect(ladder.getBlockElements("compare")).toEqual([]);
		});
	});

	describe("claimsMnemonic", () => {
		it("réserve les noms de ses blocs timer et compteur, pas les autres", () => {
			const ladder = new Ladder("l1", "L");
			ladder.addElements(ladder.sections[0].id, [
				createTimerBlockElement(
					{ name: "Tempo", timerType: "TON", pt: "T#1s" },
					0,
					0,
				),
				createContactElement("Moteur", "NO", 1, 0),
			]);

			expect(ladder.claimsMnemonic("Tempo")).toBe(true);
			expect(ladder.claimsMnemonic("Moteur")).toBe(false);
			expect(ladder.claimsMnemonic("Libre")).toBe(false);
		});
	});

	describe("getCallRefusalFrom", () => {
		function setup() {
			const caller = new Ladder("caller", "Appelant");
			const other = new Ladder("other", "Autre");
			const excluded = new Ladder("excluded", "Exclu");
			excluded.excludedFromExecution = true;
			return { caller, other, excluded };
		}

		it("accepte un ladder exécuté", () => {
			const { caller, other } = setup();

			expect(other.getCallRefusalFrom(caller)).toBeUndefined();
		});

		it("refuse le Main", () => {
			const { caller } = setup();
			const main = new Ladder("main", "Main", undefined, "main");

			expect(main.getCallRefusalFrom(caller)).toBe("main");
		});

		it("refuse l'appelant lui-même", () => {
			const { caller } = setup();

			expect(caller.getCallRefusalFrom(caller)).toBe("self");
		});

		it("refuse un ladder exclu depuis un appelant exécuté", () => {
			const { caller, excluded } = setup();

			expect(excluded.getCallRefusalFrom(caller)).toBe("excluded");
		});

		it("accepte un ladder exclu depuis un appelant exclu", () => {
			const { caller, excluded } = setup();
			caller.excludedFromExecution = true;

			expect(excluded.getCallRefusalFrom(caller)).toBeUndefined();
		});

		it("refuse l'appelant lui-même, même exclu", () => {
			const { caller } = setup();
			caller.excludedFromExecution = true;

			expect(caller.getCallRefusalFrom(caller)).toBe("self");
		});
	});

	describe("connections", () => {
		it("addConnections relie deux éléments existants, removeConnections les délie", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);

			ladder.addConnections(section.id, [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			]);
			expect(section.connections.map((c) => c.id)).toEqual(["c1"]);

			ladder.removeConnections(section.id, [
				{ sourceId: contact.id, targetId: coil.id },
			]);
			expect(section.connections).toEqual([]);
		});

		it("addConnections lève si source ou target n'existe pas dans la section", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			expect(() =>
				ladder.addConnections(section.id, [
					new Connection(
						"c1",
						{ id: contact.id, type: "contact", handle: "source" },
						{ id: "missing", type: "coil", handle: "target" },
					),
				]),
			).toThrow();
		});

		it("getAllConnections aplatit les connexions de toutes les sections, avec leur sectionId", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			]);

			expect(ladder.getAllConnections()).toEqual([
				{
					sectionId: section.id,
					connection: expect.objectContaining({ id: "c1" }),
				},
			]);
		});
	});

	it("isMain is true only for the main role", () => {
		expect(new Ladder("l1", "L").isMain()).toBe(false);
		expect(new Ladder("l2", "S", undefined, "standard").isMain()).toBe(false);
		expect(new Ladder("l3", "Main", undefined, "main").isMain()).toBe(true);
	});

	it("can be excluded from execution, except the Main", () => {
		expect(new Ladder("l1", "L").canBeExcludedFromExecution()).toBe(true);
		expect(
			new Ladder("l2", "Main", undefined, "main").canBeExcludedFromExecution(),
		).toBe(false);
	});

	describe("copy", () => {
		it("copie en profondeur sections, éléments et connexions", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			]);

			const copy = ladder.copy();
			const copiedSection = copy.sections[0];

			expect(copy).not.toBe(ladder);
			expect(copiedSection).not.toBe(section);
			expect(copiedSection.elements).not.toBe(section.elements);
			expect(copiedSection.elements).toEqual(section.elements);
			expect(copiedSection.connections[0]).not.toBe(section.connections[0]);
			expect(copiedSection.connections).toEqual(section.connections);
		});

		it("ne partage pas les params des blocs avec l'original", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const compare = createCompareBlockElement(0, 0, {
				in1: "A",
				in2: "1",
				operator: "<",
			});
			ladder.addElements(section.id, [compare]);

			const copy = ladder.copy();
			const copiedBlock = copy.sections[0].elements[0] as typeof compare;

			expect(copiedBlock.data.params).toEqual(compare.data.params);
			expect(copiedBlock.data.params).not.toBe(compare.data.params);

			copy.renameVariableReferences({ A: "B" });

			expect(copiedBlock.data.params).toMatchObject({ in1: "B" });
			expect(compare.data.params).toMatchObject({ in1: "A" });
		});

		it("préserve le rôle du ladder", () => {
			const main = new Ladder("l1", "Main", undefined, "main");
			expect(main.copy().role).toBe("main");
		});

		it("preserves excludedFromExecution", () => {
			const ladder = new Ladder("l1", "L");
			expect(ladder.copy().excludedFromExecution).toBe(false);
			ladder.excludedFromExecution = true;
			expect(ladder.copy().excludedFromExecution).toBe(true);
		});
	});

	describe("renameVariableReferences", () => {
		it.each(["constructor", "toString", "valueOf"])(
			"laisse intacts un contact et une pinoche de bloc nommés %s quand une autre variable est renommée",
			(name) => {
				const ladder = new Ladder("l1", "Mon ladder");
				const [section] = ladder.sections;
				const contact = createContactElement(name, "NO", 0, 0);
				const compare = createCompareBlockElement(0, 2, {
					in1: name,
					in2: "niveau",
					operator: "<",
				});
				ladder.addElements(section.id, [contact, compare]);

				ladder.renameVariableReferences({ niveau: "level" });

				expect(contact.data.variable).toBe(name);
				expect(compare.data.params).toMatchObject({ in1: name, in2: "level" });
			},
		);

		it("renomme un contact nommé toString quand c'est lui qui est renommé", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("toString", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);
			const renames: Record<string, string> = {};
			renames["toString"] = "autre";

			ladder.renameVariableReferences(renames);

			expect(contact.data.variable).toBe("autre");
		});

		it("réécrit la variable référencée par les contacts et bobines de toutes les sections", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section1] = ladder.sections;
			const section2 = ladder.createSection("B");
			const contact = createContactElement("moteur", "NO", 0, 0);
			const coil = createCoilElement("moteur", "normal", 0, 1);
			ladder.addElements(section1.id, [contact]);
			ladder.addElements(section2.id, [coil]);

			ladder.renameVariableReferences({ moteur: "pompe" });

			expect(contact.data.variable).toBe("pompe");
			expect(coil.data.variable).toBe("pompe");
		});

		it("réécrit les pinoches de variable des blocs sans toucher aux littéraux ni aux autres params", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const arithmetic = createArithmeticBlockElement(0, 0, {
				in1: "places",
				in2: "1",
				out: "places",
				operator: "+",
			});
			const compare = createCompareBlockElement(0, 2, {
				in1: "niveau",
				in2: "places",
				operator: "<",
			});
			const timer = createTimerBlockElement(
				{ name: "places", timerType: "TON", pt: "niveau", et: "T#3s" },
				4,
				0,
			);
			ladder.addElements(section.id, [arithmetic, compare, timer]);

			ladder.renameVariableReferences({ places: "spaces", niveau: "level" });

			expect(arithmetic.data.params).toEqual({
				in1: "spaces",
				in2: "1",
				out: "spaces",
				operator: "+",
			});
			expect(compare.data.params).toMatchObject({
				in1: "level",
				in2: "spaces",
			});
			expect(timer.data.params).toMatchObject({
				name: "places",
				pt: "level",
				et: "T#3s",
			});
		});

		it("ne touche pas les éléments référençant une autre variable", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("capteur", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			ladder.renameVariableReferences({ moteur: "pompe" });

			expect(contact.data.variable).toBe("capteur");
		});

		it("ne fait rien pour un renommage vide", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("moteur", "NO", 0, 0);
			ladder.addElements(section.id, [contact]);

			ladder.renameVariableReferences({});

			expect(contact.data.variable).toBe("moteur");
		});
	});

	describe("translateExpressionsKeywords", () => {
		it("ne lève pas et ne modifie aucun élément (Ladder n'a pas d'expression textuelle)", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("moteur", "NO", 0, 0);
			const coil = createCoilElement("moteur", "normal", 0, 1);
			ladder.addElements(section.id, [contact, coil]);

			expect(() => ladder.translateExpressionsKeywords()).not.toThrow();

			expect(contact.data.variable).toBe("moteur");
			expect(coil.data.variable).toBe("moteur");
		});
	});

	describe("createFromJSON", () => {
		it("reconstruit un ladder identique après un aller-retour JSON", () => {
			const ladder = new Ladder("l1", "Mon ladder");
			const [section] = ladder.sections;
			const contact = createContactElement("A", "NF", 0, 0);
			const coil = createCoilElement("Q1", "set", 0, 1);
			ladder.addElements(section.id, [contact, coil]);
			ladder.addConnections(section.id, [
				new Connection(
					"c1",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			]);
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

		it("préserve le rôle, et retombe sur 'standard' si absent du JSON", () => {
			const main = new Ladder("l1", "Main", undefined, "main");
			expect(Ladder.createFromJSON(JSON.stringify(main)).role).toBe("main");

			const legacyJSON = JSON.stringify({
				id: "l2",
				name: "Ancien ladder",
				type: "ladder",
				sections: [],
			});
			expect(Ladder.createFromJSON(legacyJSON).role).toBe("standard");
		});

		it("restores excludedFromExecution, and defaults to false when absent from the JSON", () => {
			const ladder = new Ladder("l1", "L");
			ladder.excludedFromExecution = true;
			expect(
				Ladder.createFromJSON(JSON.stringify(ladder)).excludedFromExecution,
			).toBe(true);

			const legacyJSON = JSON.stringify({ id: "l2", name: "L2", sections: [] });
			expect(Ladder.createFromJSON(legacyJSON).excludedFromExecution).toBe(
				false,
			);
		});
	});
});
