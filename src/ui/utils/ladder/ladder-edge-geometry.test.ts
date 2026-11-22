import {
	buildVertices,
	findVerticalSegment,
	pxToQuarterCol,
	QUARTER_CELL_WIDTH,
	quarterColToPx,
} from "@/ui/utils/ladder/ladder-edge-geometry";
import { getConnectionLinePoints } from "@/ui/utils/ladder/ladder-flow-builder";

describe("buildVertices", () => {
	it("deux points droits quand source et cible sont sur la même ligne", () => {
		expect(buildVertices(10, 50, 200, 50, [[0, 3]])).toEqual([
			[10, 50],
			[200, 50],
		]);
	});

	it("repli sur getConnectionLinePoints sans points", () => {
		expect(buildVertices(10, 50, 200, 120, [])).toEqual(
			getConnectionLinePoints(10, 50, 200, 120),
		);
	});

	it("avec un point par extrémité : coude sur sourceY puis targetY", () => {
		expect(
			buildVertices(10, 50, 200, 120, [
				[0, 2],
				[1, 2],
			]),
		).toEqual([
			[10, 50],
			[quarterColToPx(2), 50],
			[quarterColToPx(2), 120],
			[200, 120],
		]);
	});

	it("avec 3 segments : sourceY, puis targetY pour les suivants", () => {
		const vertices = buildVertices(10, 50, 300, 120, [
			[0, 1],
			[1, 4],
			[1, 6],
		]);
		expect(vertices).toEqual([
			[10, 50],
			[quarterColToPx(1), 50],
			[quarterColToPx(4), 120],
			[quarterColToPx(6), 120],
			[300, 120],
		]);
	});
});

describe("findVerticalSegment", () => {
	it("null sans segment vertical", () => {
		expect(
			findVerticalSegment([
				[0, 10],
				[50, 10],
				[80, 10],
			]),
		).toBeNull();
	});

	it("renvoie le premier segment vertical avec x, yA, yB", () => {
		expect(
			findVerticalSegment([
				[0, 10],
				[40, 10],
				[40, 90],
				[70, 90],
				[70, 20],
			]),
		).toEqual({ x: 40, yA: 10, yB: 90 });
	});

	it("un point répété (même x, même y) n'est pas un segment vertical", () => {
		expect(
			findVerticalSegment([
				[0, 10],
				[0, 10],
			]),
		).toBeNull();
	});
});

describe("quarterColToPx / pxToQuarterCol", () => {
	it("sont inverses l'un de l'autre", () => {
		for (const q of [-2, 0, 1, 4, 9])
			expect(pxToQuarterCol(quarterColToPx(q))).toBe(q);
	});

	it("arrondit au quart de colonne le plus proche", () => {
		const base = quarterColToPx(3);
		expect(pxToQuarterCol(base + QUARTER_CELL_WIDTH * 0.4)).toBe(3);
		expect(pxToQuarterCol(base + QUARTER_CELL_WIDTH * 0.6)).toBe(4);
	});
});
