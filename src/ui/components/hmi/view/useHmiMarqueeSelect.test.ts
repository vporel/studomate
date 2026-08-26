import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { intersects } from "./useHmiMarqueeSelect";

function widgetAt(x: number, y: number, width: number, height: number): HmiWidget {
	const widget = HmiWidget.create("push-button", x, y);
	widget.size = { width, height };
	return widget;
}

describe("intersects", () => {
	it("détecte un widget entièrement contenu dans le rectangle", () => {
		const widget = widgetAt(10, 10, 20, 20);
		expect(intersects(widget, { x: 0, y: 0, width: 100, height: 100 })).toBe(true);
	});

	it("détecte un widget qui ne fait que chevaucher un bord du rectangle", () => {
		const widget = widgetAt(90, 90, 20, 20);
		expect(intersects(widget, { x: 0, y: 0, width: 100, height: 100 })).toBe(true);
	});

	it("ignore un widget entièrement en dehors du rectangle", () => {
		const widget = widgetAt(200, 200, 20, 20);
		expect(intersects(widget, { x: 0, y: 0, width: 100, height: 100 })).toBe(false);
	});

	it("ignore un widget qui ne fait qu'effleurer le bord (contact sans chevauchement)", () => {
		const widget = widgetAt(100, 0, 20, 20);
		expect(intersects(widget, { x: 0, y: 0, width: 100, height: 100 })).toBe(false);
	});

	it("détecte un widget qui contient entièrement le rectangle", () => {
		const widget = widgetAt(0, 0, 200, 200);
		expect(intersects(widget, { x: 50, y: 50, width: 10, height: 10 })).toBe(true);
	});
});
