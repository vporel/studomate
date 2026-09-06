import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { isContained } from "./useHmiMarqueeSelect";

function widgetAt(
	x: number,
	y: number,
	width: number,
	height: number,
): HmiWidget {
	const widget = HmiWidget.create("push-button", x, y);
	widget.size = { width, height };
	return widget;
}

describe("isContained", () => {
	const rect = { x: 0, y: 0, width: 100, height: 100 };

	it("retient un widget entièrement contenu dans le rectangle", () => {
		expect(isContained(widgetAt(10, 10, 20, 20), rect)).toBe(true);
	});

	it("retient un widget dont les bords coïncident avec ceux du rectangle", () => {
		expect(isContained(widgetAt(0, 0, 100, 100), rect)).toBe(true);
	});

	it("ignore un widget qui ne fait que chevaucher un bord du rectangle", () => {
		expect(isContained(widgetAt(90, 90, 20, 20), rect)).toBe(false);
	});

	it("ignore un widget qui dépasse d'un seul côté", () => {
		expect(isContained(widgetAt(10, 10, 20, 200), rect)).toBe(false);
	});

	it("ignore un widget entièrement en dehors du rectangle", () => {
		expect(isContained(widgetAt(200, 200, 20, 20), rect)).toBe(false);
	});

	it("ignore un widget qui contient entièrement le rectangle", () => {
		expect(
			isContained(widgetAt(0, 0, 200, 200), { x: 50, y: 50, width: 10, height: 10 }),
		).toBe(false);
	});
});
