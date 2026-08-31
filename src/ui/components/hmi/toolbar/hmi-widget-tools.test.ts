import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { HMI_SHAPE_TOOLS, HMI_WIDGET_TOOLS } from "./hmi-widget-tools";

describe("HMI_WIDGET_TOOLS", () => {
	it("contient exactement les types interactifs", () => {
		const interactive = (
			Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[]
		).filter((t) => HMI_WIDGET_DEFINITIONS[t].kind === "interactive");
		expect(HMI_WIDGET_TOOLS.map((t) => t.type).sort()).toEqual(
			interactive.sort(),
		);
	});

	it("est trié par paletteOrder", () => {
		const orders = HMI_WIDGET_TOOLS.map(
			(t) => HMI_WIDGET_UI[t.type].paletteOrder,
		);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});
});

describe("HMI_SHAPE_TOOLS", () => {
	it("expose deux variantes d'ellipse (Cercle et Ellipse)", () => {
		const ellipses = HMI_SHAPE_TOOLS.filter((t) => t.type === "ellipse");
		expect(ellipses.map((t) => t.label)).toEqual(["Cercle", "Ellipse"]);
	});

	it('la variante "Cercle" verrouille le ratio et démarre carrée', () => {
		const cercle = HMI_SHAPE_TOOLS.find((t) => t.label === "Cercle");
		expect(cercle?.sizeOverride).toEqual({ width: 40, height: 40 });
		expect(cercle?.dataOverride).toEqual({ lockAspectRatio: true });
	});

	it("place les formes simples avant les variantes d'ellipse, dans l'ordre paletteOrder", () => {
		expect(HMI_SHAPE_TOOLS.map((t) => t.label ?? t.type)).toEqual([
			"text",
			"line",
			"rectangle",
			"Cercle",
			"Ellipse",
		]);
	});
});
