import Section from "@/schemas/ladder/section.schema";
import Connection from "@/schemas/ladder/connection.schema";
import { createRandomId } from "@/ids";
import {
	buildKeyboardMoveChanges,
	cellOf,
	isFinishedPositionChange,
	isPositionValidForConnections,
	singleMoveNeedsRewire,
	snapPositionChange,
} from "./ladder-node-move";
import { colToX, LADDER_MAX_COLS, rowToY } from "./ladder-flow-builder";
import { NodeChange } from "@xyflow/react";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";

function contactAt(id: string, row: number, col: number) {
	return {
		id,
		type: "contact" as const,
		position: { row, col },
		data: { variableName: "X", type: "no" as const },
	};
}

function sectionWith(elements: ReturnType<typeof contactAt>[], connections: Connection[] = []) {
	const s = new Section(createRandomId(), "S", "");
	s.elements = elements as never;
	s.connections = connections;
	return s;
}

describe("ladder-node-move", () => {
	it("snapPositionChange accroche à la grille colonne/ligne réelle", () => {
		const change = {
			type: "position",
			id: "a",
			position: { x: colToX(3) + 7, y: rowToY(2) - 4 },
		} as NodeChange<LadderNodeType>;
		const snapped = snapPositionChange(change);
		expect(snapped).toMatchObject({
			position: { x: colToX(3), y: rowToY(2) },
		});
	});

	it("snapPositionChange laisse passer un changement non-position", () => {
		const change = { type: "select", id: "a", selected: true } as NodeChange<LadderNodeType>;
		expect(snapPositionChange(change)).toBe(change);
	});

	it("cellOf convertit une position pixel en cellule", () => {
		expect(cellOf({ x: colToX(4), y: rowToY(1) })).toEqual({ row: 1, col: 4 });
	});

	it("isFinishedPositionChange : vrai au relâchement, faux en frame intermédiaire", () => {
		const base = { type: "position" as const, id: "a", position: { x: 0, y: 0 } };
		expect(isFinishedPositionChange({ ...base, dragging: true })).toBe(false);
		expect(isFinishedPositionChange({ ...base, dragging: false })).toBe(true);
		expect(isFinishedPositionChange({ ...base })).toBe(true);
	});

	it("isPositionValidForConnections détecte une inversion d'ordre colonne", () => {
		const a = contactAt("a", 0, 1);
		const b = contactAt("b", 0, 3);
		const conn = new Connection(
			createRandomId(),
			{ id: "a", type: "contact" as never, handle: "source" },
			{ id: "b", type: "contact" as never, handle: "target" },
			{ points: [] },
		);
		const section = sectionWith([a, b], [conn]);
		expect(isPositionValidForConnections(section, "a", { row: 0, col: 2 })).toBe(true);
		expect(isPositionValidForConnections(section, "a", { row: 0, col: 4 })).toBe(false);
	});

	it("singleMoveNeedsRewire est vrai quand le déplacement inverse une connexion", () => {
		const a = contactAt("a", 0, 1);
		const b = contactAt("b", 0, 3);
		const conn = new Connection(
			createRandomId(),
			{ id: "a", type: "contact" as never, handle: "source" },
			{ id: "b", type: "contact" as never, handle: "target" },
			{ points: [] },
		);
		const section = sectionWith([a, b], [conn]);
		expect(singleMoveNeedsRewire(section, a as never, { row: 0, col: 4 })).toBe(true);
		expect(singleMoveNeedsRewire(section, a as never, { row: 0, col: 2 })).toBe(false);
	});

	describe("buildKeyboardMoveChanges", () => {
		it("déplace l'élément sélectionné d'une cellule dans la direction demandée", () => {
			const section = sectionWith([contactAt("a", 1, 2)]);
			const [change] = buildKeyboardMoveChanges(section, ["a"], 0, 1);
			expect(change).toEqual({
				id: "a",
				type: "position",
				position: { x: colToX(3), y: rowToY(1) },
				dragging: false,
			});
		});

		it("borne à la grille : pas de mouvement contre un bord", () => {
			const section = sectionWith([contactAt("a", 0, 0)]);
			expect(buildKeyboardMoveChanges(section, ["a"], -1, 0)).toEqual([]);
			expect(buildKeyboardMoveChanges(section, ["a"], 0, -1)).toEqual([]);

			const atRightEdge = sectionWith([
				contactAt("a", 0, LADDER_MAX_COLS - 1),
			]);
			expect(buildKeyboardMoveChanges(atRightEdge, ["a"], 0, 1)).toEqual([]);
		});

		it("ignore les bornes d'alimentation et les ids inconnus", () => {
			const section = sectionWith([contactAt("a", 1, 2)]);
			expect(buildKeyboardMoveChanges(section, ["inconnu"], 0, 1)).toEqual([]);
		});

		it("déplacement multiple : tout ou rien si une cible est occupée", () => {
			// a et b sélectionnés, c non sélectionné juste à droite de b : b ne peut pas avancer.
			const section = sectionWith([
				contactAt("a", 0, 0),
				contactAt("b", 0, 2),
				contactAt("c", 0, 3),
			]);
			expect(buildKeyboardMoveChanges(section, ["a", "b"], 0, 1)).toEqual([]);
		});

		it("déplacement multiple : les deux avancent si les cibles sont libres", () => {
			const section = sectionWith([
				contactAt("a", 0, 0),
				contactAt("b", 0, 2),
			]);
			const changes = buildKeyboardMoveChanges(section, ["a", "b"], 1, 0);
			expect(changes.map((c) => c.id).sort()).toEqual(["a", "b"]);
			expect(changes[0].position).toEqual({ x: colToX(0), y: rowToY(1) });
		});
	});
});
