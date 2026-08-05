import Connection from "@/schemas/ladder/connection.schema";
import { createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	classifyCellTouch,
	computeConnectionSegments,
	findCellCrossings,
	initialConnectionPoints,
	pushConnectionBend,
} from "./ladder-connection-path";

describe("initialConnectionPoints", () => {
	it("aucun point sur la même ligne", () => {
		expect(initialConnectionPoints({ row: 0, col: 0 }, { row: 0, col: 3 })).toEqual([]);
	});

	it("deux points à la colonne de sortie de la source, un par ligne", () => {
		expect(initialConnectionPoints({ row: 0, col: 1 }, { row: 2, col: 3 })).toEqual([
			[2, 8],
			[10, 8],
		]);
	});
});

describe("pushConnectionBend", () => {
	const points: [number, number][] = [
		[2, 8],
		[10, 8],
	]; // coude unique à quarterCol=8 (sortie de la source col=1)

	it("aucun effet sur la même ligne", () => {
		expect(pushConnectionBend(points, "source", { row: 1, col: 1 }, { row: 1, col: 3 })).toBe(points);
	});

	it("aucun effet si points est vide (même ligne mémorisée)", () => {
		expect(pushConnectionBend([], "source", { row: 0, col: 1 }, { row: 2, col: 3 })).toEqual([]);
	});

	it("la source s'éloigne du coude : le stub s'allonge, le coude ne bouge pas", () => {
		const result = pushConnectionBend(points, "source", { row: 0, col: 0 }, { row: 2, col: 3 });

		expect(result).toEqual(points);
	});

	it("la source rattrape le coude : elle le pousse (coude unique, les deux côtés suivent)", () => {
		const result = pushConnectionBend(points, "source", { row: 0, col: 3 }, { row: 2, col: 3 });

		expect(result).toEqual([
			[2, 16],
			[10, 16],
		]);
	});

	it("la cible s'éloigne du coude : le stub s'allonge, le coude ne bouge pas", () => {
		const result = pushConnectionBend(points, "target", { row: 0, col: 1 }, { row: 2, col: 5 });

		expect(result).toEqual(points);
	});

	it("la cible rattrape le coude : elle le pousse (coude unique, les deux côtés suivent)", () => {
		const result = pushConnectionBend(points, "target", { row: 0, col: 1 }, { row: 2, col: 1 });

		expect(result).toEqual([
			[2, 4],
			[10, 4],
		]);
	});

	it("tracé à 3 segments : la source pousse uniquement son propre coude tant qu'elle n'atteint pas l'autre", () => {
		const asymmetric: [number, number][] = [
			[2, 8],
			[10, 20],
		];

		const result = pushConnectionBend(asymmetric, "source", { row: 0, col: 2 }, { row: 2, col: 3 });

		expect(result).toEqual([
			[2, 12],
			[10, 20],
		]);
	});

	it("tracé à 3 segments : la source qui dépasse le coude de la cible fusionne les deux", () => {
		const asymmetric: [number, number][] = [
			[2, 8],
			[10, 20],
		];

		const result = pushConnectionBend(asymmetric, "source", { row: 0, col: 5 }, { row: 2, col: 3 });

		expect(result).toEqual([
			[2, 24],
			[10, 24],
		]);
	});

	it("ne modifie jamais le coude du côté qui n'a pas bougé, même si son stub semble long", () => {
		const asymmetric: [number, number][] = [
			[2, 8],
			[10, 20],
		];

		// La cible n'a pas bougé (toujours col=3, entrée=12 < colB=20) : colB doit rester intact.
		const result = pushConnectionBend(asymmetric, "source", { row: 0, col: 1 }, { row: 2, col: 3 });

		expect(result).toEqual(asymmetric);
	});
});

describe("computeConnectionSegments", () => {
	it("un seul segment horizontal sur la même ligne", () => {
		const segments = computeConnectionSegments({ row: 0, col: 0 }, { row: 0, col: 3 });

		expect(segments).toEqual([{ orientation: "horizontal", quarterRow: 2, quarterColA: 4, quarterColB: 12 }]);
	});

	it("un coude à la sortie de la source entre deux lignes différentes", () => {
		const segments = computeConnectionSegments({ row: 0, col: 1 }, { row: 2, col: 3 });

		expect(segments).toEqual([
			{ orientation: "vertical", quarterCol: 8, quarterRowA: 2, quarterRowB: 10 },
			{ orientation: "horizontal", quarterRow: 10, quarterColA: 8, quarterColB: 12 },
		]);
	});

	it("même colonne mais lignes différentes : les poignées ne coïncident jamais (2 segments)", () => {
		const segments = computeConnectionSegments({ row: 0, col: 2 }, { row: 1, col: 2 });

		// Sortie (bord droit de la col 2) = 12, entrée (bord gauche de la col 2) = 8 : décalées.
		expect(segments).toEqual([
			{ orientation: "vertical", quarterCol: 12, quarterRowA: 2, quarterRowB: 6 },
			{ orientation: "horizontal", quarterRow: 6, quarterColA: 12, quarterColB: 8 },
		]);
	});

	it("cible visuellement à gauche de la source (élément déplacé après coup) : toujours 2 segments valides", () => {
		const segments = computeConnectionSegments({ row: 0, col: 5 }, { row: 1, col: 0 });

		expect(segments).toEqual([
			{ orientation: "vertical", quarterCol: 24, quarterRowA: 2, quarterRowB: 6 },
			{ orientation: "horizontal", quarterRow: 6, quarterColA: 24, quarterColB: 0 },
		]);
	});

	it("borne d'alimentation (col -1) comme source : sortie à la même abscisse que le bord gauche de la colonne 0, sans cas particulier", () => {
		const segments = computeConnectionSegments({ row: 0, col: -1 }, { row: 0, col: 2 });

		expect(segments).toEqual([{ orientation: "horizontal", quarterRow: 2, quarterColA: 0, quarterColB: 8 }]);
	});

	it("utilise le coude explicite (points) plutôt que la règle auto, y compris pour un 3e segment (stub après la source)", () => {
		// Coude déplacé à quarterCol=20, loin de la sortie auto de la source (quarterCol=8).
		const segments = computeConnectionSegments(
			{ row: 0, col: 1 },
			{ row: 2, col: 3 },
			[
				[2, 20],
				[10, 20],
			],
		);

		expect(segments).toEqual([
			{ orientation: "horizontal", quarterRow: 2, quarterColA: 8, quarterColB: 20 },
			{ orientation: "vertical", quarterCol: 20, quarterRowA: 2, quarterRowB: 10 },
			{ orientation: "horizontal", quarterRow: 10, quarterColA: 20, quarterColB: 12 },
		]);
	});

	it("ignore la ligne stockée dans un point — toujours réécrite depuis la position actuelle de la source/cible", () => {
		// Points mémorisés pour l'ancienne ligne de la source (0) et de la cible (2) — la source a
		// depuis bougé à la ligne 4 (coude toujours à quarterCol=20), sans que le point soit mis à
		// jour : la ligne stockée (2 = rowCenter(0)) est obsolète.
		const segments = computeConnectionSegments({ row: 4, col: 1 }, { row: 2, col: 3 }, [
			[2, 20],
			[10, 20],
		]);

		expect(segments).toEqual([
			{ orientation: "horizontal", quarterRow: 18, quarterColA: 8, quarterColB: 20 }, // rowCenter(4) = 18
			{ orientation: "vertical", quarterCol: 20, quarterRowA: 18, quarterRowB: 10 },
			{ orientation: "horizontal", quarterRow: 10, quarterColA: 20, quarterColB: 12 },
		]);
	});

	it("ignore les points mémorisés tant que les deux lignes coïncident (ligne droite)", () => {
		const segments = computeConnectionSegments({ row: 1, col: 0 }, { row: 1, col: 3 }, [
			[2, 20],
			[10, 20],
		]);

		expect(segments).toEqual([{ orientation: "horizontal", quarterRow: 6, quarterColA: 4, quarterColB: 12 }]);
	});
});

describe("classifyCellTouch", () => {
	it("through : un segment horizontal traverse la cellule sur toute sa largeur", () => {
		const segments = computeConnectionSegments({ row: 0, col: 0 }, { row: 0, col: 3 });

		expect(classifyCellTouch(segments, 0, 1)).toBe("through");
		expect(classifyCellTouch(segments, 0, 2)).toBe("through");
	});

	it("left/right : un segment vertical longe la cellule sans la traverser", () => {
		const segments = computeConnectionSegments({ row: 0, col: 1 }, { row: 2, col: 3 });
		// Segment vertical à quarterCol=8 = bord droit de la colonne 1 / bord gauche de la colonne 2.

		expect(classifyCellTouch(segments, 1, 1)).toBe("right");
		expect(classifyCellTouch(segments, 1, 2)).toBe("left");
	});

	it("aucune touche pour une cellule hors du tracé", () => {
		const segments = computeConnectionSegments({ row: 0, col: 0 }, { row: 0, col: 3 });

		expect(classifyCellTouch(segments, 5, 5)).toBeNull();
	});
});

describe("findCellCrossings", () => {
	it("through : une connexion directe entre deux voisins sur la même ligne", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [contact, coil];
		const connection = new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" });
		section.connections = [connection];

		expect(findCellCrossings(section, 0, 2).through).toBe(connection);
	});

	it("left/right : une connexion inter-lignes longe des cellules vides sans les traverser", () => {
		const section = new Section("s1", "S");
		const contactTop = createContactElement("A", "NO", 0, 1);
		const coilBottom = createCoilElement("Q1", "normal", 2, 3);
		section.elements = [contactTop, coilBottom];
		const connection = new Connection("c1", { id: contactTop.id, type: "contact", handle: "source" }, { id: coilBottom.id, type: "coil", handle: "target" });
		section.connections = [connection];

		expect(findCellCrossings(section, 1, 1).right).toBe(connection);
		expect(findCellCrossings(section, 1, 2).left).toBe(connection);
		expect(findCellCrossings(section, 1, 1).through).toBeUndefined();
	});

	it("left et right peuvent venir de deux connexions différentes sur la même cellule", () => {
		const section = new Section("s1", "S");
		// Sortie en colonne 0 → segment vertical au bord gauche de la cellule (1,1) testée.
		const contactLeft = createContactElement("A", "NO", 0, 0);
		const targetOfLeft = createCoilElement("Q1", "normal", 3, 2);
		// Sortie en colonne 1 → segment vertical au bord droit de la cellule (1,1) testée.
		const contactRight = createContactElement("B", "NO", 2, 1);
		const targetOfRight = createContactElement("C", "NO", 0, 4);
		section.elements = [contactLeft, targetOfLeft, contactRight, targetOfRight];
		const leftTouchConnection = new Connection("c-left", { id: contactLeft.id, type: "contact", handle: "source" }, { id: targetOfLeft.id, type: "coil", handle: "target" });
		const rightTouchConnection = new Connection("c-right", { id: contactRight.id, type: "contact", handle: "source" }, { id: targetOfRight.id, type: "coil", handle: "target" });
		section.connections = [leftTouchConnection, rightTouchConnection];

		const crossings = findCellCrossings(section, 1, 1);

		expect(crossings.left).toBe(leftTouchConnection);
		expect(crossings.right).toBe(rightTouchConnection);
	});

	it("ignore une connexion référençant un élément absent (défensif)", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		section.connections = [new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: "missing", type: "coil", handle: "target" })];

		expect(() => findCellCrossings(section, 0, 1)).not.toThrow();
		expect(findCellCrossings(section, 0, 1)).toEqual({});
	});

	it("fonctionne aussi pour une connexion depuis une borne d'alimentation", () => {
		const section = new Section("s1", "S");
		const railTerminal = createRailTerminalElement(0);
		const coil = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [railTerminal, coil];
		const connection = new Connection("c1", { id: railTerminal.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" });
		section.connections = [connection];

		expect(findCellCrossings(section, 0, 1).through).toBe(connection);
	});
});
