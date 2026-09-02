import { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import { PAPERS_SIZES } from "@/ui/constants";
import { mmToPx } from "@/ui/lib/utils";
import { getConnectionLinePoints, getFlowDimensions } from "./grafcet-utils";

describe("getConnectionLinePoints", () => {
	it("relie directement quand les extrémités sont alignées verticalement", () => {
		const points = getConnectionLinePoints(50, 0, 51, 100);
		expect(points).toEqual([
			[50, 0],
			[51, 100],
		]);
	});

	it("route en S orthogonal quand la cible est en dessous mais désalignée en X", () => {
		const points = getConnectionLinePoints(0, 0, 100, 100);
		expect(points).toEqual([
			[0, 0],
			[0, 50],
			[100, 50],
			[100, 100],
		]);
	});

	it("contourne par la gauche en 6 points quand la cible est au-dessus (boucle de retour)", () => {
		const points = getConnectionLinePoints(100, 200, 101, 100);
		expect(points).toHaveLength(6);
		expect(points[0]).toEqual([100, 200]);
		expect(points[points.length - 1]).toEqual([101, 100]);
		// Décalage à gauche de 40px, convention du contournement
		expect(points[2][0]).toBe(60);
		expect(points[3][0]).toBe(60);
	});

	it("contourne même quand les extrémités sont désalignées en X (extrémité déplacée)", () => {
		const points = getConnectionLinePoints(100, 200, 300, 100);
		expect(points).toHaveLength(6);
		// Le segment vertical passe à gauche des deux extrémités
		expect(points[2][0]).toBe(60);
		expect(points[3][0]).toBe(60);
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
	] as [
		GrafcetFormat["type"],
		GrafcetFormat["orientation"],
		{ width: number; height: number },
	][])(
		"%s %s → dimensions converties en pixels",
		(type, orientation, expected) => {
			const dimensions = getFlowDimensions({ type, orientation });

			expect(dimensions).toEqual({
				width: mmToPx(expected.width),
				height: mmToPx(expected.height),
			});
		},
	);
});
