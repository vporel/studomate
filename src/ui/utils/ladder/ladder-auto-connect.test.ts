import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { computeAutoConnectionsForElements } from "./ladder-auto-connect";
import { initialConnectionPoints } from "./ladder-connection-path";

const contact = (row: number, col: number) =>
	createContactElement("x", "NO", row, col);
const coil = (row: number, col: number) =>
	createCoilElement("y", "normal", row, col);

const link = (source: LadderElement, target: LadderElement) =>
	new Connection(
		`${source.id}->${target.id}`,
		{ id: source.id, type: source.type as never, handle: "source" },
		{ id: target.id, type: target.type as never, handle: "target" },
		{ points: initialConnectionPoints(source.position, target.position) },
	);

const makeSection = (
	elements: LadderElement[] = [],
	connections: Connection[] = [],
) => new Section("s", "Section", "", elements, connections);

const pairs = (connections: Connection[]) =>
	connections.map((c) => [c.source.id, c.target.id]);

describe("computeAutoConnectionsForElements", () => {
	describe("column 0", () => {
		it("creates the rail terminal of the row and connects it to the element", () => {
			const element = contact(2, 0);
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[element],
				[],
			);

			const rails = result.elementsToAdd.filter(
				(e) => e.type === "railTerminal",
			);
			expect(rails).toHaveLength(1);
			expect(rails[0].position.row).toBe(2);
			expect(result.elementsToAdd[0]).toBe(rails[0]);
			expect(result.elementsToAdd).toContain(element);
			expect(pairs(result.connectionsToAdd)).toEqual([
				[rails[0].id, element.id],
			]);
			expect(result.connectionsToRemove).toEqual([]);
		});

		it("reuses the rail terminal already in the section", () => {
			const rail = createRailTerminalElement(1);
			const element = contact(1, 0);
			const result = computeAutoConnectionsForElements(
				makeSection([rail]),
				[element],
				[],
			);

			expect(result.elementsToAdd).toEqual([element]);
			expect(pairs(result.connectionsToAdd)).toEqual([[rail.id, element.id]]);
		});

		it("does not take the rail of another row", () => {
			const otherRail = createRailTerminalElement(0);
			const element = contact(1, 0);
			const result = computeAutoConnectionsForElements(
				makeSection([otherRail]),
				[element],
				[],
			);

			const created = result.elementsToAdd.filter(
				(e) => e.type === "railTerminal",
			);
			expect(created).toHaveLength(1);
			expect(created[0].position.row).toBe(1);
		});

		it("creates a single rail when several placed elements start on the same row", () => {
			const a = contact(0, 0);
			const b = coil(0, 0);
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[a, b],
				[],
			);

			const rails = result.elementsToAdd.filter(
				(e) => e.type === "railTerminal",
			);
			expect(rails).toHaveLength(1);
			expect(result.connectionsToAdd.map((c) => c.source.id)).toEqual([
				rails[0].id,
				rails[0].id,
			]);
		});

		it("creates one rail per row for elements on different rows", () => {
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[contact(0, 0), contact(1, 0)],
				[],
			);

			const rails = result.elementsToAdd.filter(
				(e) => e.type === "railTerminal",
			);
			expect(rails.map((r) => r.position.row).sort()).toEqual([0, 1]);
		});
	});

	describe("drop (not paste)", () => {
		it("connects from the nearest leaf on the left even when not adjacent", () => {
			const left = contact(0, 0);
			const element = contact(0, 4);
			const result = computeAutoConnectionsForElements(
				makeSection([left]),
				[element],
				[{ id: left.id, row: 0, col: 0 }],
			);

			expect(pairs(result.connectionsToAdd)).toEqual([[left.id, element.id]]);
		});

		it("adds no left connection when no leaf is on the row", () => {
			const element = contact(0, 4);
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[element],
				[],
			);

			expect(result.connectionsToAdd).toEqual([]);
			expect(result.elementsToAdd).toEqual([element]);
		});
	});

	describe("paste", () => {
		it("connects only from a strictly adjacent left neighbor of the section", () => {
			const left = contact(0, 0);
			const adjacent = contact(0, 1);
			const result = computeAutoConnectionsForElements(
				makeSection([left]),
				[adjacent],
				[{ id: left.id, row: 0, col: 0 }],
				true,
			);

			expect(pairs(result.connectionsToAdd)).toEqual([[left.id, adjacent.id]]);
		});

		it("does not connect from a non adjacent left neighbor", () => {
			const left = contact(0, 0);
			const pasted = contact(0, 3);
			const result = computeAutoConnectionsForElements(
				makeSection([left]),
				[pasted],
				[{ id: left.id, row: 0, col: 0 }],
				true,
			);

			expect(result.connectionsToAdd).toEqual([]);
		});

		it("connects pasted elements adjacent to each other", () => {
			const first = contact(0, 2);
			const second = contact(0, 3);
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[first, second],
				[],
				true,
			);

			expect(pairs(result.connectionsToAdd)).toEqual([[first.id, second.id]]);
		});
	});

	describe("right neighbor", () => {
		it("connects a contact to the right neighbor of the section", () => {
			const right = coil(0, 3);
			const element = contact(0, 2);
			const result = computeAutoConnectionsForElements(
				makeSection([right]),
				[element],
				[],
			);

			expect(pairs(result.connectionsToAdd)).toEqual([[element.id, right.id]]);
		});

		it("never connects a coil to a right neighbor", () => {
			const right = contact(0, 3);
			const element = coil(0, 2);
			const result = computeAutoConnectionsForElements(
				makeSection([right]),
				[element],
				[],
			);

			expect(result.connectionsToAdd).toEqual([]);
		});

		it("takes the right neighbor among the elements being placed", () => {
			const first = contact(0, 2);
			const second = coil(0, 3);
			const result = computeAutoConnectionsForElements(
				makeSection(),
				[first, second],
				[],
			);

			expect(pairs(result.connectionsToAdd)).toContainEqual([
				first.id,
				second.id,
			]);
		});
	});

	describe("insertion on an existing connection", () => {
		it("splits a connection passing through the cell", () => {
			const a = contact(0, 0);
			const b = coil(0, 3);
			const existing = link(a, b);
			const element = contact(0, 1);
			const result = computeAutoConnectionsForElements(
				makeSection([a, b], [existing]),
				[element],
				[],
			);

			expect(result.connectionsToRemove).toEqual([existing]);
			expect(pairs(result.connectionsToAdd)).toEqual([
				[a.id, element.id],
				[element.id, b.id],
			]);
			expect(result.elementsToAdd).toEqual([element]);
		});

		it("does not connect a through insertion to a missing endpoint", () => {
			const a = contact(0, 0);
			const b = coil(0, 3);
			const existing = link(a, b);
			const element = contact(0, 1);
			const result = computeAutoConnectionsForElements(
				makeSection([a], [existing]),
				[element],
				[],
			);

			expect(result.connectionsToRemove).toEqual([]);
			expect(result.connectionsToAdd).toEqual([]);
		});
	});
});
