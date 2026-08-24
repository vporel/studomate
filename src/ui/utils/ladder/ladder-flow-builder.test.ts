import Connection from "@/schemas/ladder/connection.schema";
import { createCoilElement, createContactElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import { createTimerBlockElement } from "@/schemas/function-blocks/timer.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	buildTargetEdges,
	buildTargetNodes,
	colToX,
	computeRowHeightsInCells,
	computeSectionLayout,
	GRID_CELL_HEIGHT,
	LADDER_CONNECTION_EDGE_TYPE,
	LADDER_FLOW_TOP_OFFSET,
	rowToY,
	yToRow,
} from "./ladder-flow-builder";

describe("buildTargetNodes / buildTargetEdges", () => {
	it("ne produit qu'une borne d'alimentation virtuelle pour une section sans élément", () => {
		const section = new Section("s1", "Section 1");

		expect(buildTargetNodes(section)).toEqual([
			{
				id: "virtual-rail-0",
				type: "railTerminal",
				position: { x: 0, y: rowToY(0) },
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
		expect(contactNode.position).toEqual({ x: colToX(0), y: rowToY(0) });

		const coilNode = nodes.find((n) => n.id === coil.id)!;
		expect(coilNode.position).toEqual({ x: colToX(1), y: rowToY(0) });

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

describe("hauteur de ligne variable (bloc timer)", () => {
	function sectionWithTimerAtRow0AndCoilAtRow1(): Section {
		const section = new Section("s1", "Section 1");
		const rail0 = createRailTerminalElement(0);
		const block = createTimerBlockElement({ name: "Tempo1", timerType: "TON", pt: "T#5s" }, 0, 0);
		const rail1 = createRailTerminalElement(1);
		const coil = createCoilElement("Q1", "normal", 1, 0);
		section.elements = [rail0, block, rail1, coil];
		return section;
	}

	it("computeRowHeightsInCells vaut 2 pour la ligne d'un bloc timer, 1 ailleurs", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();

		const heights = computeRowHeightsInCells(section);

		expect(heights.get(0)).toBe(2);
		expect(heights.get(1)).toBe(1);
	});

	it("rowToY pousse la ligne suivante de 2 cellules quand la précédente contient un bloc timer", () => {
		const heights = computeRowHeightsInCells(sectionWithTimerAtRow0AndCoilAtRow1());

		expect(rowToY(0, heights)).toBe(LADDER_FLOW_TOP_OFFSET);
		expect(rowToY(1, heights)).toBe(LADDER_FLOW_TOP_OFFSET + 2 * GRID_CELL_HEIGHT);
	});

	it("yToRow reconnaît la ligne 1 même déplacée par la hauteur de la ligne 0", () => {
		const heights = computeRowHeightsInCells(sectionWithTimerAtRow0AndCoilAtRow1());

		const yOfRow1 = LADDER_FLOW_TOP_OFFSET + 2 * GRID_CELL_HEIGHT + 5;
		expect(Math.floor(yToRow(yOfRow1, heights))).toBe(1);
	});

	it("buildTargetNodes positionne la ligne 1 plus bas quand la ligne 0 contient un bloc timer", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();

		const nodes = buildTargetNodes(section);
		const coilNode = nodes.find((n) => n.type === "coil")!;

		expect(coilNode.position.y).toBe(LADDER_FLOW_TOP_OFFSET + 2 * GRID_CELL_HEIGHT);
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
