/** @jest-environment jsdom */
import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import { HMI_WIDGET_DEFINITIONS } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import type { HmiWidgetTool } from "@/ui/components/hmi/logic/constants";
import { useHmiWidgetDnD } from "@/ui/components/hmi/toolbar/HmiWidgetDnDContext";
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { DragEvent as ReactDragEvent } from "react";
import useHmiCanvasDrop from "./useHmiCanvasDrop";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/hmi/toolbar/HmiWidgetDnDContext");
jest.mock("@/ui/i18n/useT", () => ({
	useT: () => (key: string) => key,
}));

function setup(
	draggedItem: HmiWidgetTool | null,
	{ zoom = 1, isSimulation = false } = {},
) {
	const addWidget = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({ addWidget }),
	);
	(useHmiWidgetDnD as jest.Mock).mockReturnValue({ draggedItem });
	const { result } = renderHook(() => useHmiCanvasDrop(zoom, isSimulation));
	return {
		addWidget,
		onDragOver: result.current[0],
		onDrop: result.current[1],
	};
}

function dragEvent(clientX = 0, clientY = 0, rect = { left: 0, top: 0 }) {
	return {
		clientX,
		clientY,
		preventDefault: jest.fn(),
		dataTransfer: { dropEffect: "none" },
		currentTarget: { getBoundingClientRect: () => rect },
	} as unknown as ReactDragEvent<HTMLDivElement> & {
		preventDefault: jest.Mock;
		dataTransfer: { dropEffect: string };
	};
}

const SIZE = { width: 100, height: 60 };

describe("useHmiCanvasDrop onDragOver", () => {
	it("autorise la dépose en copie quand un élément est glissé", () => {
		const { onDragOver } = setup({ type: "push-button" });
		const e = dragEvent();
		onDragOver(e);
		expect(e.preventDefault).toHaveBeenCalled();
		expect(e.dataTransfer.dropEffect).toBe("copy");
	});

	it("ignore l'événement en simulation", () => {
		const { onDragOver } = setup(
			{ type: "push-button" },
			{ isSimulation: true },
		);
		const e = dragEvent();
		onDragOver(e);
		expect(e.preventDefault).not.toHaveBeenCalled();
		expect(e.dataTransfer.dropEffect).toBe("none");
	});

	it("ignore l'événement sans élément glissé", () => {
		const { onDragOver } = setup(null);
		const e = dragEvent();
		onDragOver(e);
		expect(e.preventDefault).not.toHaveBeenCalled();
	});
});

describe("useHmiCanvasDrop onDrop", () => {
	it("ignore la dépose en simulation", () => {
		const { addWidget, onDrop } = setup(
			{ type: "push-button" },
			{ isSimulation: true },
		);
		const e = dragEvent(300, 300);
		onDrop(e);
		expect(e.preventDefault).not.toHaveBeenCalled();
		expect(addWidget).not.toHaveBeenCalled();
	});

	it("ignore la dépose sans élément glissé", () => {
		const { addWidget, onDrop } = setup(null);
		const e = dragEvent(300, 300);
		onDrop(e);
		expect(e.preventDefault).not.toHaveBeenCalled();
		expect(addWidget).not.toHaveBeenCalled();
	});

	it("centre le widget sur le point de dépose, relatif au canvas", () => {
		const { addWidget, onDrop } = setup({
			type: "push-button",
			sizeOverride: SIZE,
		});
		const e = dragEvent(450, 350, { left: 100, top: 50 });
		onDrop(e);
		expect(e.preventDefault).toHaveBeenCalled();
		// raw (350, 300) minus half size (50, 30)
		expect(addWidget).toHaveBeenCalledTimes(1);
		expect(addWidget.mock.calls[0].slice(0, 4)).toEqual([
			"push-button",
			300,
			270,
			SIZE,
		]);
	});

	it("divise la position par le zoom", () => {
		const { addWidget, onDrop } = setup(
			{ type: "push-button", sizeOverride: SIZE },
			{ zoom: 2 },
		);
		onDrop(dragEvent(800, 600));
		// raw (400, 300) minus (50, 30)
		expect(addWidget.mock.calls[0].slice(1, 3)).toEqual([350, 270]);
	});

	it("aligne la position sur la grille", () => {
		const { addWidget, onDrop } = setup({
			type: "push-button",
			sizeOverride: SIZE,
		});
		onDrop(dragEvent(343, 287));
		// raw (293, 257) -> snapped (290, 260)
		expect(addWidget.mock.calls[0].slice(1, 3)).toEqual([290, 260]);
	});

	it("borne le widget au coin haut-gauche du canvas", () => {
		const { addWidget, onDrop } = setup({
			type: "push-button",
			sizeOverride: SIZE,
		});
		onDrop(dragEvent(-500, -500));
		expect(addWidget.mock.calls[0].slice(1, 3)).toEqual([0, 0]);
	});

	it("borne le widget au coin bas-droit du canvas", () => {
		const { addWidget, onDrop } = setup({
			type: "push-button",
			sizeOverride: SIZE,
		});
		onDrop(dragEvent(9000, 9000));
		expect(addWidget.mock.calls[0].slice(1, 3)).toEqual([
			HMI_CANVAS_WIDTH - SIZE.width,
			HMI_CANVAS_HEIGHT - SIZE.height,
		]);
	});

	it("utilise la taille par défaut du type sans sizeOverride", () => {
		const { addWidget, onDrop } = setup({ type: "push-button" });
		onDrop(dragEvent(9000, 9000));
		const size = HMI_WIDGET_DEFINITIONS["push-button"].defaultSize;
		expect(addWidget.mock.calls[0].slice(1, 4)).toEqual([
			HMI_CANVAS_WIDTH - size.width,
			HMI_CANVAS_HEIGHT - size.height,
			undefined,
		]);
	});

	it("passe le nom et le libellé par défaut localisés", () => {
		const { addWidget, onDrop } = setup({ type: "push-button" });
		onDrop(dragEvent(300, 300));
		const [, , , , data, nameBase] = addWidget.mock.calls[0];
		expect(nameBase).toBe("widgetNames.push-button");
		expect(data).toEqual({ label: "defaultLabels.push-button" });
	});

	it("fusionne dataOverride par-dessus les données localisées", () => {
		const { addWidget, onDrop } = setup({
			type: "push-button",
			dataOverride: { label: "Custom" },
		});
		onDrop(dragEvent(300, 300));
		expect(addWidget.mock.calls[0][4]).toEqual({ label: "Custom" });
	});
});
