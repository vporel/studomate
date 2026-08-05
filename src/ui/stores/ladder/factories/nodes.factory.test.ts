import { createContactElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import LadderNodesFactory from "./nodes.factory";

describe("LadderNodesFactory.syncNodes", () => {
	describe("construction depuis rien", () => {
		it("crée un nœud par élément, plus les bornes d'alimentation virtuelles manquantes", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];

			const nodes = LadderNodesFactory.syncNodes([], section);

			expect(nodes.map((n) => n.id).sort()).toEqual(["virtual-rail-0", contact.id].sort());
		});

		it("getInitialNodes est le cas particulier d'une vue vide", () => {
			const section = new Section("s1", "S");
			section.elements = [createContactElement("A", "NO", 0, 0)];

			expect(LadderNodesFactory.getInitialNodes(section)).toEqual(
				LadderNodesFactory.syncNodes([], section),
			);
		});
	});

	describe("préservation de l'état de vue", () => {
		it("conserve la sélection quand l'élément ne change pas", () => {
			const section = new Section("s1", "S");
			section.elements = [createContactElement("A", "NO", 0, 0)];
			const prev = LadderNodesFactory.syncNodes([], section).map((n) => ({ ...n, selected: true }));

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			expect(nodes.every((n) => n.selected)).toBe(true);
		});

		it("conserve l'identité (même référence) d'un nœud inchangé", () => {
			const section = new Section("s1", "S");
			section.elements = [createContactElement("A", "NO", 0, 0)];
			const prev = LadderNodesFactory.syncNodes([], section);

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			expect(nodes[0]).toBe(prev[0]);
		});

		it("met à jour la position/donnée depuis le domaine, sans casser la sélection", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];
			const prev = LadderNodesFactory.syncNodes([], section).map((n) => ({ ...n, selected: true }));
			contact.position.col = 3;

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			const contactNode = nodes.find((n) => n.id === contact.id)!;
			expect(contactNode.selected).toBe(true);
			expect(contactNode.position.x).not.toBe(prev.find((n) => n.id === contact.id)!.position.x);
		});

		it("garde la position de la vue (pas celle du domaine) pendant un glisser en cours", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];
			const prev = LadderNodesFactory.syncNodes([], section).map((n) =>
				n.id === contact.id ? { ...n, position: { x: 999, y: 999 }, dragging: true } : n,
			);
			contact.position.col = 3; // le domaine "avance" pendant que la vue est encore en geste

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			expect(nodes.find((n) => n.id === contact.id)!.position).toEqual({ x: 999, y: 999 });
		});
	});

	describe("ajout/retrait", () => {
		it("retire un nœud dont l'élément a disparu du domaine", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];
			const prev = LadderNodesFactory.syncNodes([], section);
			section.elements = [];

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			expect(nodes.find((n) => n.id === contact.id)).toBeUndefined();
		});

		it("ajoute un nœud pour un nouvel élément, sans toucher aux autres", () => {
			const section = new Section("s1", "S");
			const contactA = createContactElement("A", "NO", 0, 0);
			section.elements = [contactA];
			const prev = LadderNodesFactory.syncNodes([], section);
			const contactB = createContactElement("B", "NO", 0, 1);
			section.elements = [contactA, contactB];

			const nodes = LadderNodesFactory.syncNodes(prev, section);

			expect(nodes.find((n) => n.id === contactA.id)).toBe(prev.find((n) => n.id === contactA.id));
			expect(nodes.find((n) => n.id === contactB.id)).toBeDefined();
		});
	});
});
