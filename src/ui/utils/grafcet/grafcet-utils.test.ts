import { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import { PAPERS_SIZES } from "@/ui/constants";
import { mmToPx } from "@/ui/lib/utils";
import { getConnectionLinePoints, getFlowDimensions } from "./grafcet-utils";

describe("getConnectionLinePoints", () => {
	it("relie directement les deux points dans le cas standard", () => {
		const points = getConnectionLinePoints(0, 0, 100, 100);
		expect(points).toEqual([
			[0, 0],
			[100, 100],
		]);
	});

	it("contourne par la gauche en 6 points quand la cible est au-dessus et presque alignée verticalement (boucle de retour)", () => {
		const points = getConnectionLinePoints(100, 200, 101, 100);
		expect(points).toHaveLength(6);
		expect(points[0]).toEqual([100, 200]);
		expect(points[points.length - 1]).toEqual([101, 100]);
		// Décalage à gauche de 40px, convention du contournement
		expect(points[2][0]).toBe(60);
		expect(points[3][0]).toBe(60);
	});

	it("seuil de 5px : un écart de 4 déclenche le contournement", () => {
		const points = getConnectionLinePoints(100, 200, 104, 100);
		expect(points).toHaveLength(6);
	});

	it("seuil de 5px : un écart de 5 ne déclenche pas le contournement", () => {
		const points = getConnectionLinePoints(100, 200, 105, 100);
		expect(points).toEqual([
			[100, 200],
			[105, 100],
		]);
	});

	it("ne contourne pas quand la cible n'est pas au-dessus de la source", () => {
		const points = getConnectionLinePoints(100, 100, 101, 200);
		expect(points).toEqual([
			[100, 100],
			[101, 200],
		]);
	});
});

describe("getFlowDimensions", () => {
	it.each([
		["A4", "portrait", PAPERS_SIZES.A4_PORTRAIT],
		["A4", "landscape", PAPERS_SIZES.A4_LANDSCAPE],
		["A3", "portrait", PAPERS_SIZES.A3_PORTRAIT],
		["A3", "landscape", PAPERS_SIZES.A3_LANDSCAPE],
	] as [GrafcetFormat["type"], GrafcetFormat["orientation"], { width: number; height: number }][])(
		"%s %s → dimensions converties en pixels",
		(type, orientation, expected) => {
			const dimensions = getFlowDimensions({ type, orientation });

			expect(dimensions).toEqual({ width: mmToPx(expected.width), height: mmToPx(expected.height) });
		},
	);
});
