/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import useHmiMarqueeSelect, { isContained } from "./useHmiMarqueeSelect";

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
			isContained(widgetAt(0, 0, 200, 200), {
				x: 50,
				y: 50,
				width: 10,
				height: 10,
			}),
		).toBe(false);
	});
});

describe("useHmiMarqueeSelect", () => {
	const mouse = (
		type: "mousemove" | "mouseup",
		clientX: number,
		clientY: number,
	) => window.dispatchEvent(new MouseEvent(type, { clientX, clientY }));

	function setup(widgets: HmiWidget[] = [widgetAt(10, 10, 20, 20)]) {
		const canvas = document.createElement("div");
		canvas.getBoundingClientRect = () =>
			({ left: 0, top: 0, right: 800, bottom: 600 }) as DOMRect;
		const ref = { current: canvas } as RefObject<HTMLDivElement | null>;
		const setSelection = jest.fn();
		const onPreviewChange = jest.fn();
		const { result, unmount } = renderHook(() =>
			useHmiMarqueeSelect(ref, 1, widgets, setSelection, onPreviewChange),
		);
		const begin = (x = 0, y = 0, selection: string[] = []) =>
			result.current(
				{ clientX: x, clientY: y } as unknown as ReactMouseEvent,
				selection,
			);
		return { setSelection, onPreviewChange, begin, unmount };
	}

	it("sélectionne les widgets contenus dans le rectangle au relâchement", () => {
		const target = widgetAt(10, 10, 20, 20);
		const { setSelection, begin } = setup([target]);
		begin(0, 0);

		mouse("mouseup", 100, 100);

		expect(setSelection).toHaveBeenCalledWith([target.id]);
	});

	it("ne sélectionne rien et laisse le clic au canvas quand le glisser est nul", () => {
		const { setSelection, begin } = setup();
		begin(50, 50);

		mouse("mouseup", 50, 50);

		expect(setSelection).not.toHaveBeenCalled();
	});

	it("n'écrit aucune sélection si le composant est démonté en plein glisser", () => {
		const { setSelection, begin, unmount } = setup();
		begin(0, 0);
		mouse("mousemove", 60, 60);

		unmount();
		mouse("mouseup", 100, 100);

		expect(setSelection).not.toHaveBeenCalled();
	});

	it("retire ses écouteurs de window au démontage", () => {
		const add = jest.spyOn(window, "addEventListener");
		const remove = jest.spyOn(window, "removeEventListener");
		const { begin, unmount } = setup();
		begin(0, 0);
		const added = add.mock.calls.filter(([type]) =>
			["mousemove", "mouseup"].includes(type as string),
		);

		unmount();

		for (const [type, listener] of added) {
			expect(remove).toHaveBeenCalledWith(type, listener);
		}
		add.mockRestore();
		remove.mockRestore();
	});

	it("n'empile pas les écouteurs quand un glisser commence avant la fin du précédent", () => {
		const { setSelection, begin } = setup();
		begin(0, 0);
		begin(0, 0);

		mouse("mouseup", 100, 100);

		expect(setSelection).toHaveBeenCalledTimes(1);
	});
});
