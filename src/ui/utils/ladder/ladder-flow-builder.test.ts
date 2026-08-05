import Connection from "@/schemas/ladder/connection.schema";
import { createCoilElement, createContactElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	buildTargetEdges,
	buildTargetNodes,
	computeSectionLayout,
	GRID_CELL_WIDTH,
	LADDER_CONNECTION_EDGE_TYPE,
	POWER_RAIL_OFFSET,
} from "./ladder-flow-builder";

describe("buildTargetNodes / buildTargetEdges", () => {
	it("ne produit qu'une borne d'alimentation virtuelle pour une section sans élément", () => {
		const section = new Section("s1", "Section 1");

		expect(buildTargetNodes(section)).toEqual([
			{
				id: "virtual-rail-0",
				type: "railTerminal",
				position: { x: 0, y: 0 },
				data: { virtual: true },
				selectable: false,
				draggable: false,
			},
		]);
		expect(buildTargetEdges(section)).toEqual([]);
	});

	it("place chaque élément exactement à sa position de grille, et une arête par connexion", () => {
		const section = new Section("s1", "Section 1");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q0", "normal", 0, 1);
		section.elements = [contact, coil];
		section.connections = [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })];

		const nodes = buildTargetNodes(section);

		const contactNode = nodes.find((n) => n.id === contact.id)!;
		expect(contactNode.type).toBe("contact");
		expect(contactNode.data).toEqual({ variable: "A", mode: "NO" });
		expect(contactNode.position).toEqual({ x: POWER_RAIL_OFFSET + 0 * GRID_CELL_WIDTH, y: 0 * 45 });

		const coilNode = nodes.find((n) => n.id === coil.id)!;
		expect(coilNode.position).toEqual({ x: POWER_RAIL_OFFSET + 1 * GRID_CELL_WIDTH, y: 0 * 45 });

		expect(buildTargetEdges(section)).toEqual([
			{ id: "c1", source: contact.id, sourceHandle: "source", target: coil.id, targetHandle: "target", type: LADDER_CONNECTION_EDGE_TYPE, data: { points: [] } },
		]);
	});

	it("place deux branches indépendantes sur des lignes distinctes, chacune vers sa propre bobine", () => {
		const section = new Section("s1", "Section 1");
		const contactA = createContactElement("A", "NO", 0, 0);
		const coilQ1 = createCoilElement("Q1", "normal", 0, 1);
		const contactB = createContactElement("B", "NO", 1, 0);
		const coilQ2 = createCoilElement("Q2", "normal", 1, 1);
		section.elements = [contactA, coilQ1, contactB, coilQ2];
		section.connections = [
			new Connection("c1", { id: contactA.id, type: "contact", handle: "source" }, { id: coilQ1.id, type: "coil", handle: "target" }),
			new Connection("c2", { id: contactB.id, type: "contact", handle: "source" }, { id: coilQ2.id, type: "coil", handle: "target" }),
		];

		const nodes = buildTargetNodes(section);

		const nodeA = nodes.find((n) => n.id === contactA.id)!;
		const nodeB = nodes.find((n) => n.id === contactB.id)!;
		expect(nodeA.position.y).not.toBe(nodeB.position.y);
	});
});

describe("computeSectionLayout", () => {
	it("calcule totalRows/maxCol/leafPositions depuis les éléments de la section", () => {
		const section = new Section("s1", "Section 1");
		const contactA = createContactElement("A", "NO", 0, 0);
		const coilQ1 = createCoilElement("Q1", "normal", 1, 2);
		section.elements = [contactA, coilQ1];

		const { totalRows, maxCol, leafPositions } = computeSectionLayout(section);

		expect(totalRows).toBe(2);
		expect(maxCol).toBe(2);
		expect(leafPositions).toEqual([
			{ id: contactA.id, row: 0, col: 0 },
			{ id: coilQ1.id, row: 1, col: 2 },
		]);
	});
});
