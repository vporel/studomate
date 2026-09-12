import clampGroupDelta from "./hmi-group-move";
import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";

const widget = (x: number, y: number, width = 40, height = 30) => ({
	position: { x, y },
	size: { width, height },
});

describe("clampGroupDelta", () => {
	it("laisse passer un delta qui garde le groupe dans le canvas", () => {
		expect(clampGroupDelta([widget(100, 100)], 10, -20)).toEqual({
			dx: 10,
			dy: -20,
		});
	});

	it("borne au bord gauche / haut (pas de position négative)", () => {
		expect(clampGroupDelta([widget(5, 8)], -30, -30)).toEqual({
			dx: -5,
			dy: -8,
		});
	});

	it("borne au bord droit / bas sur la boîte englobante du groupe", () => {
		const group = [
			widget(HMI_CANVAS_WIDTH - 100, 0),
			widget(HMI_CANVAS_WIDTH - 60, HMI_CANVAS_HEIGHT - 30),
		];
		expect(clampGroupDelta(group, 999, 999)).toEqual({
			dx: 20, // le widget le plus à droite finit à x+width = CANVAS_WIDTH
			dy: 0,
		});
	});

	it("groupe vide → aucun déplacement", () => {
		expect(clampGroupDelta([], 10, 10)).toEqual({ dx: 0, dy: 0 });
	});
});
