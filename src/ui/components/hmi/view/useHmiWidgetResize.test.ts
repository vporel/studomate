import { HmiWidgetSize } from "@/schemas/hmi/hmi-widget.schema";
import { resizeRect } from "./useHmiWidgetResize";

const MIN: HmiWidgetSize = { width: 30, height: 30 };
const start = { x: 100, y: 100, width: 100, height: 80 };

const rect = (
	direction: Parameters<typeof resizeRect>[0]["direction"],
	dx: number,
	dy: number,
	extra: Partial<Parameters<typeof resizeRect>[0]> = {},
) => resizeRect({ direction, start, dx, dy, minSize: MIN, ...extra });

describe("resizeRect — sans ratio", () => {
	it("poignée est : agrandit la largeur, position et hauteur inchangées", () => {
		expect(rect("e", 40, 0)).toEqual({
			position: { x: 100, y: 100 },
			size: { width: 140, height: 80 },
		});
	});

	it("poignée sud : agrandit la hauteur", () => {
		expect(rect("s", 0, 30).size).toEqual({ width: 100, height: 110 });
	});

	it("poignée ouest : déplace le bord gauche, le bord droit reste fixe", () => {
		expect(rect("w", -40, 0)).toEqual({
			position: { x: 60, y: 100 },
			size: { width: 140, height: 80 },
		});
	});

	it("poignée nord : déplace le bord haut, le bord bas reste fixe", () => {
		expect(rect("n", 0, -40)).toEqual({
			position: { x: 100, y: 60 },
			size: { width: 100, height: 120 },
		});
	});

	it("coin nord-ouest : déplace les deux bords, ancre le coin sud-est", () => {
		expect(rect("nw", -40, -40)).toEqual({
			position: { x: 60, y: 60 },
			size: { width: 140, height: 120 },
		});
	});

	it("coin sud-est : ne touche pas la position", () => {
		expect(rect("se", 40, 30)).toEqual({
			position: { x: 100, y: 100 },
			size: { width: 140, height: 110 },
		});
	});

	it("accroche le bord mobile à la grille", () => {
		expect(rect("e", 43, 0).size.width).toBe(140);
		expect(rect("w", -43, 0).position.x).toBe(60);
	});

	it("borne la largeur à la taille minimale (poignée ouest)", () => {
		expect(rect("w", 1000, 0)).toEqual({
			position: { x: 170, y: 100 },
			size: { width: 30, height: 80 },
		});
	});

	it("borne le bord gauche au canvas", () => {
		expect(rect("w", -1000, 0)).toEqual({
			position: { x: 0, y: 100 },
			size: { width: 200, height: 80 },
		});
	});

	it("borne la largeur au bord droit du canvas (poignée est)", () => {
		expect(rect("e", 5000, 0).size.width).toBe(900);
	});
});

describe("resizeRect — ratio verrouillé", () => {
	const square = { x: 100, y: 100, width: 80, height: 80 };
	const sq = (
		direction: Parameters<typeof resizeRect>[0]["direction"],
		dx: number,
		dy: number,
	) =>
		resizeRect({
			direction,
			start: square,
			dx,
			dy,
			minSize: { width: 20, height: 20 },
			aspectRatio: 1,
		});

	it("coin : l'axe qui bouge le plus pilote, l'autre dimension suit", () => {
		expect(sq("se", 40, 10).size).toEqual({ width: 120, height: 120 });
		expect(sq("se", 10, 40).size).toEqual({ width: 120, height: 120 });
	});

	it("coin nord-ouest : ancre le coin sud-est", () => {
		expect(sq("nw", -40, -40)).toEqual({
			position: { x: 60, y: 60 },
			size: { width: 120, height: 120 },
		});
	});

	it("poignée de bord verticale : la hauteur pilote la largeur", () => {
		expect(sq("n", 0, -20)).toEqual({
			position: { x: 100, y: 80 },
			size: { width: 100, height: 100 },
		});
	});

	it("borne le côté au canvas en gardant le ratio", () => {
		expect(sq("se", 5000, 5000).size).toEqual({ width: 540, height: 540 });
	});
});
