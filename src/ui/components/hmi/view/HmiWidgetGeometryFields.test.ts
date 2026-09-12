import { HmiWidgetSize } from "@/schemas/hmi/hmi-widget.schema";
import { applyGeometryEdit } from "./HmiWidgetGeometryFields";

const MIN: HmiWidgetSize = { width: 30, height: 30 };
const rect = { position: { x: 100, y: 100 }, size: { width: 100, height: 80 } };

describe("applyGeometryEdit — sans ratio", () => {
	it("déplace un seul axe, laisse la taille intacte", () => {
		expect(applyGeometryEdit(rect, "x", 250, MIN)).toEqual({
			position: { x: 250, y: 100 },
			size: { width: 100, height: 80 },
		});
	});

	it("borne la position au canvas", () => {
		expect(applyGeometryEdit(rect, "x", -50, MIN).position.x).toBe(0);
		expect(applyGeometryEdit(rect, "x", 5000, MIN).position.x).toBe(900);
	});

	it("borne la largeur entre le minimum du type et le bord du canvas", () => {
		expect(applyGeometryEdit(rect, "width", 10, MIN).size.width).toBe(30);
		expect(applyGeometryEdit(rect, "width", 5000, MIN).size.width).toBe(900);
		expect(applyGeometryEdit(rect, "height", 200, MIN).size).toEqual({
			width: 100,
			height: 200,
		});
	});
});

describe("applyGeometryEdit — ratio verrouillé", () => {
	const wide = {
		position: { x: 100, y: 100 },
		size: { width: 200, height: 100 },
	};
	const min: HmiWidgetSize = { width: 40, height: 20 };

	it("éditer la largeur fait suivre la hauteur", () => {
		expect(applyGeometryEdit(wide, "width", 300, min, 2).size).toEqual({
			width: 300,
			height: 150,
		});
	});

	it("éditer la hauteur fait suivre la largeur", () => {
		expect(applyGeometryEdit(wide, "height", 200, min, 2).size).toEqual({
			width: 400,
			height: 200,
		});
	});

	it("garde le ratio quand une dimension est bornée par le canvas", () => {
		expect(applyGeometryEdit(wide, "width", 5000, min, 2).size).toEqual({
			width: 900,
			height: 450,
		});
	});
});
