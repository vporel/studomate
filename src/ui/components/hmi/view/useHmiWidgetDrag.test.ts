/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { MouseEvent as ReactMouseEvent } from "react";
import useHmiWidgetDrag from "./useHmiWidgetDrag";

jest.mock("@/ui/components/hmi/HmiContext");

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

function mouse(
	type: "mousemove" | "mouseup",
	clientX: number,
	clientY: number,
) {
	window.dispatchEvent(new MouseEvent(type, { clientX, clientY }));
}

function setup(zoom = 1) {
	const moveWidgets = jest.fn();
	const onPreviewChange = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({ moveWidgets }),
	);
	const { result } = renderHook(() => useHmiWidgetDrag(zoom, onPreviewChange));
	const start = (group: HmiWidget[], x = 500, y = 300) =>
		result.current(
			{ clientX: x, clientY: y } as unknown as ReactMouseEvent,
			group,
		);
	return { moveWidgets, onPreviewChange, start };
}

describe("useHmiWidgetDrag", () => {
	const a = widgetAt(100, 100, 50, 50);
	const b = widgetAt(300, 200, 100, 60);
	// Group bounding box: x 100..400, y 100..260

	it("n'appelle rien avant le premier mouvement", () => {
		const { moveWidgets, onPreviewChange, start } = setup();
		start([a]);
		expect(onPreviewChange).not.toHaveBeenCalled();
		expect(moveWidgets).not.toHaveBeenCalled();
		mouse("mouseup", 500, 300);
	});

	it("envoie l'aperçu à chaque mousemove avec les ids du groupe", () => {
		const { onPreviewChange, start } = setup();
		start([a, b]);
		mouse("mousemove", 520, 310);
		mouse("mousemove", 540, 330);
		expect(onPreviewChange).toHaveBeenCalledTimes(2);
		expect(onPreviewChange).toHaveBeenNthCalledWith(1, {
			widgetIds: [a.id, b.id],
			dx: 20,
			dy: 10,
		});
		expect(onPreviewChange).toHaveBeenNthCalledWith(2, {
			widgetIds: [a.id, b.id],
			dx: 40,
			dy: 30,
		});
		mouse("mouseup", 540, 330);
	});

	it("divise le delta par le zoom", () => {
		const { onPreviewChange, start } = setup(2);
		start([a]);
		mouse("mousemove", 580, 340);
		expect(onPreviewChange).toHaveBeenCalledWith({
			widgetIds: [a.id],
			dx: 40,
			dy: 20,
		});
		mouse("mouseup", 580, 340);
	});

	it("aligne le delta sur la grille", () => {
		const { onPreviewChange, start } = setup();
		start([a]);
		mouse("mousemove", 543, 314);
		expect(onPreviewChange).toHaveBeenCalledWith({
			widgetIds: [a.id],
			dx: 40,
			dy: 10,
		});
		mouse("mouseup", 543, 314);
	});

	it("borne le delta à gauche et en haut par la boîte englobante du groupe", () => {
		const { onPreviewChange, start } = setup();
		start([a, b]);
		mouse("mousemove", -5000, -5000);
		expect(onPreviewChange).toHaveBeenCalledWith({
			widgetIds: [a.id, b.id],
			dx: -100,
			dy: -100,
		});
		mouse("mouseup", -5000, -5000);
	});

	it("borne le delta à droite et en bas par la boîte englobante du groupe", () => {
		const { onPreviewChange, start } = setup();
		start([a, b]);
		mouse("mousemove", 9000, 9000);
		expect(onPreviewChange).toHaveBeenCalledWith({
			widgetIds: [a.id, b.id],
			dx: 600,
			dy: 380,
		});
		mouse("mouseup", 9000, 9000);
	});

	it("au relâchement : aperçu à null, un seul moveWidgets, écouteurs retirés", () => {
		const { moveWidgets, onPreviewChange, start } = setup();
		start([a, b]);
		mouse("mousemove", 520, 310);
		mouse("mousemove", 560, 330);
		expect(moveWidgets).not.toHaveBeenCalled();
		onPreviewChange.mockClear();

		mouse("mouseup", 560, 330);
		expect(onPreviewChange).toHaveBeenCalledTimes(1);
		expect(onPreviewChange).toHaveBeenCalledWith(null);
		expect(moveWidgets).toHaveBeenCalledTimes(1);
		expect(moveWidgets).toHaveBeenCalledWith([a.id, b.id], 60, 30);

		onPreviewChange.mockClear();
		mouse("mousemove", 700, 400);
		mouse("mouseup", 700, 400);
		expect(onPreviewChange).not.toHaveBeenCalled();
		expect(moveWidgets).toHaveBeenCalledTimes(1);
	});

	it("applique le bornage et la grille au delta final", () => {
		const { moveWidgets, start } = setup();
		start([a, b]);
		mouse("mouseup", 9000, -5000);
		expect(moveWidgets).toHaveBeenCalledWith([a.id, b.id], 600, -100);
	});

	it("sans déplacement, moveWidgets est quand même appelé avec un delta nul", () => {
		const { moveWidgets, onPreviewChange, start } = setup();
		start([a]);
		mouse("mouseup", 500, 300);
		expect(onPreviewChange).toHaveBeenCalledWith(null);
		expect(moveWidgets).toHaveBeenCalledTimes(1);
		expect(moveWidgets).toHaveBeenCalledWith([a.id], 0, 0);
	});
});
