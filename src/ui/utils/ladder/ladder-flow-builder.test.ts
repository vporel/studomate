import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	buildTargetEdges,
	buildTargetNodes,
	cellRectsOverlap,
	colToX,
	computeSectionLayout,
	elementAtCell,
	elementFootprint,
	findFootprintCollision,
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
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
			),
		];

		const nodes = buildTargetNodes(section);

		const contactNode = nodes.find((n) => n.id === contact.id)!;
		expect(contactNode.type).toBe("contact");
		expect(contactNode.data).toEqual({ variable: "A", type: "NO" });
		expect(contactNode.position).toEqual({ x: colToX(0), y: rowToY(0) });

		const coilNode = nodes.find((n) => n.id === coil.id)!;
		expect(coilNode.position).toEqual({ x: colToX(1), y: rowToY(0) });

		expect(buildTargetEdges(section)).toEqual([
			{
				id: "c1",
				source: contact.id,
				sourceHandle: "source",
				target: coil.id,
				targetHandle: "target",
				type: LADDER_CONNECTION_EDGE_TYPE,
				data: { points: [] },
			},
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
			new Connection(
				"c1",
				{ id: contactA.id, type: "contact", handle: "source" },
				{ id: coilQ1.id, type: "coil", handle: "target" },
			),
			new Connection(
				"c2",
				{ id: contactB.id, type: "contact", handle: "source" },
				{ id: coilQ2.id, type: "coil", handle: "target" },
			),
		];

		const nodes = buildTargetNodes(section);

		const nodeA = nodes.find((n) => n.id === contactA.id)!;
		const nodeB = nodes.find((n) => n.id === contactB.id)!;
		expect(nodeA.position.y).not.toBe(nodeB.position.y);
	});
});

describe("grille uniforme + empreinte multi-cellules (bloc timer)", () => {
	function sectionWithTimerAtRow0AndCoilAtRow1(): Section {
		const section = new Section("s1", "Section 1");
		const rail0 = createRailTerminalElement(0);
		const block = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		const rail1 = createRailTerminalElement(1);
		const coil = createCoilElement("Q1", "normal", 1, 4);
		section.elements = [rail0, block, rail1, coil];
		return section;
	}

	it("rowToY/yToRow restent linéaires malgré un bloc de 2 cellules de haut", () => {
		expect(rowToY(0)).toBe(LADDER_FLOW_TOP_OFFSET);
		expect(rowToY(1)).toBe(LADDER_FLOW_TOP_OFFSET + GRID_CELL_HEIGHT);
		expect(Math.floor(yToRow(rowToY(1) + 5))).toBe(1);
	});

	it("elementFootprint d'un bloc timer couvre 2 colonnes et 2 lignes", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();
		const block = section.elements.find((e) => e.type === "block")!;

		expect(elementFootprint(block)).toEqual({
			row: 0,
			col: 0,
			width: 2,
			height: 2,
		});
	});

	it("la 2e ligne d'un bloc bloque un dépôt sur ses colonnes mais pas à côté", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();

		// (1,0) et (1,1) = 2e ligne du bloc → occupées
		expect(elementAtCell(section, 1, 0)?.type).toBe("block");
		expect(elementAtCell(section, 1, 1)?.type).toBe("block");
		// (1,2) = même ligne, hors des colonnes du bloc → libre
		expect(elementAtCell(section, 1, 2)).toBeUndefined();
	});

	it("cellRectsOverlap détecte un chevauchement d'une seule cellule", () => {
		expect(
			cellRectsOverlap(
				{ row: 0, col: 0, width: 2, height: 2 },
				{ row: 1, col: 1, width: 1, height: 1 },
			),
		).toBe(true);
		expect(
			cellRectsOverlap(
				{ row: 0, col: 0, width: 2, height: 2 },
				{ row: 1, col: 2, width: 1, height: 1 },
			),
		).toBe(false);
	});

	it("findFootprintCollision ignore l'élément passé à ignoreId", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();
		const block = section.elements.find((e) => e.type === "block")!;

		expect(
			findFootprintCollision(section, elementFootprint(block)),
		).toBe(block);
		expect(
			findFootprintCollision(section, elementFootprint(block), block.id),
		).toBeUndefined();
	});

	it("buildTargetNodes place la ligne 1 à une cellule de la ligne 0, bloc ou pas", () => {
		const section = sectionWithTimerAtRow0AndCoilAtRow1();

		const coilNode = buildTargetNodes(section).find((n) => n.type === "coil")!;

		expect(coilNode.position.y).toBe(LADDER_FLOW_TOP_OFFSET + GRID_CELL_HEIGHT);
	});

	it("computeSectionLayout compte les lignes traversées par un bloc dans totalRows", () => {
		const section = new Section("s1", "Section 1");
		section.elements = [
			createTimerBlockElement(
				{ name: "T", timerType: "TON", pt: "T#5s" },
				2,
				0,
			),
		];

		expect(computeSectionLayout(section).totalRows).toBe(4);
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
