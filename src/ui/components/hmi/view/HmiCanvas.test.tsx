/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import usePageEditingEnabled from "@/ui/components/projects/usePageEditingEnabled";
import type { Locale } from "@/i18n/config";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { act, fireEvent } from "@testing-library/react";
import HmiCanvas from "./HmiCanvas";
import useHmiMarqueeSelect from "./useHmiMarqueeSelect";
import useHmiWidgetDrag from "./useHmiWidgetDrag";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/projects/usePageEditingEnabled");
jest.mock("@/ui/components/hmi/context-menu/HmiContextMenu", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/ui/lib/context-menu/useContextMenuState", () => ({
	__esModule: true,
	default: () => ({
		visible: false,
		element: null,
		position: { x: 0, y: 0 },
		openContextMenu: mockOpenContextMenu,
		closeContextMenu: jest.fn(),
	}),
}));
jest.mock("./useHmiWidgetDrag");
jest.mock("./useHmiWidgetResize", () => ({
	__esModule: true,
	default: () => jest.fn(),
}));
jest.mock("./useHmiCanvasDrop", () => ({
	__esModule: true,
	default: () => [jest.fn(), jest.fn()],
}));
jest.mock("./useHmiMarqueeSelect");
jest.mock("./HmiCanvasSidebarSection", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("./HmiObjectsPanel", () => ({
	__esModule: true,
	default: () => <div data-testid="objects-panel" />,
}));
jest.mock("./HmiPagePropertiesPanel", () => ({
	__esModule: true,
	default: ({ readOnly }: { readOnly: boolean }) => (
		<div data-testid="page-panel" data-readonly={String(readOnly)} />
	),
}));
jest.mock("./HmiWidgetPropertiesPanel", () => ({
	__esModule: true,
	default: ({ widget }: { widget: HmiWidget }) => (
		<div data-testid="widget-panel">{widget.id}</div>
	),
}));
jest.mock("./HmiWidgetEventsPane", () => ({
	__esModule: true,
	default: () => <div data-testid="events-pane" />,
}));
jest.mock("./HmiWidgetAnimationsPane", () => ({
	__esModule: true,
	default: () => <div data-testid="animations-pane" />,
}));
jest.mock("./HmiWidgetItem", () => ({
	__esModule: true,
	default: (props: {
		widget: HmiWidget;
		isSelected: boolean;
		editable: boolean;
		showResizeHandle: boolean;
		previewOffset?: { dx: number; dy: number };
		onDragStart: (e: React.MouseEvent, id: string) => void;
		onContextMenu: (e: React.MouseEvent, id: string) => void;
	}) => (
		<div
			data-testid={`w-${props.widget.id}`}
			data-selected={String(props.isSelected)}
			data-handle={String(props.showResizeHandle)}
			data-offset={
				props.previewOffset
					? `${props.previewOffset.dx},${props.previewOffset.dy}`
					: ""
			}
			onMouseDown={(e) => props.onDragStart(e, props.widget.id)}
			onContextMenu={(e) => props.onContextMenu(e, props.widget.id)}
		/>
	),
}));

const mockOpenContextMenu = jest.fn();

const makeWidget = (id: string): HmiWidget =>
	({
		id,
		type: "rectangle",
		position: { x: 0, y: 0 },
		size: { width: 10, height: 10 },
		stackOrder: 0,
		data: {},
	}) as unknown as HmiWidget;

const WIDGETS = { a: makeWidget("a"), b: makeWidget("b"), c: makeWidget("c") };

const startDrag = jest.fn();
const startMarquee = jest.fn();
let onDragPreview: (p: unknown) => void;
let onMarqueeSelect: (ids: string[]) => void;
const setSelection = jest.fn();
const clearSelection = jest.fn();
const selectWidget = jest.fn();

function setup({
	selected = [] as string[],
	simulation = false,
	editable = true,
	locale = "fr" as Locale,
} = {}) {
	(usePageEditingEnabled as jest.Mock).mockReturnValue(editable);
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({
			hmiPage: { id: "p1", widgets: WIDGETS },
			selectedWidgetIds: selected,
			selectWidget,
			setSelection,
			clearSelection,
			setScreenToCanvasPosition: jest.fn(),
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			simulationManager: {},
			hmiManager: { executeAction: jest.fn() },
			project: null,
		}),
	);
	const utils = renderWithI18n(
		<HmiCanvas isSimulation={simulation} zoom={1} />,
		{ locale },
	);
	const canvas = utils.getByTestId("w-a").parentElement as HTMLElement;
	return { ...utils, canvas };
}

beforeEach(() => {
	jest.clearAllMocks();
	(useHmiWidgetDrag as jest.Mock).mockImplementation((_zoom, onPreview) => {
		onDragPreview = onPreview;
		return startDrag;
	});
	(useHmiMarqueeSelect as jest.Mock).mockImplementation(
		(_ref, _zoom, _widgets, onSelect) => {
			onMarqueeSelect = onSelect;
			return startMarquee;
		},
	);
});

describe("HmiCanvas", () => {
	describe("widget selection", () => {
		it("selects only the pressed widget and starts dragging it", () => {
			const { getByTestId } = setup({ selected: ["b"] });

			fireEvent.mouseDown(getByTestId("w-a"));

			expect(setSelection).toHaveBeenCalledWith(["a"]);
			expect(startDrag).toHaveBeenCalledWith(expect.anything(), [WIDGETS.a]);
		});

		it("keeps the whole selection when pressing a widget already in it, and drags the group", () => {
			const { getByTestId } = setup({ selected: ["a", "b"] });

			fireEvent.mouseDown(getByTestId("w-b"));

			expect(setSelection).toHaveBeenCalledWith(["a", "b"]);
			expect(startDrag).toHaveBeenCalledWith(expect.anything(), [
				WIDGETS.a,
				WIDGETS.b,
			]);
		});

		it.each([["shiftKey"], ["ctrlKey"], ["metaKey"]])(
			"adds an unselected widget with %s",
			(key) => {
				const { getByTestId } = setup({ selected: ["a"] });

				fireEvent.mouseDown(getByTestId("w-b"), { [key]: true });

				expect(setSelection).toHaveBeenCalledWith(["a", "b"]);
				expect(startDrag).toHaveBeenCalledWith(expect.anything(), [
					WIDGETS.a,
					WIDGETS.b,
				]);
			},
		);

		it("removes a selected widget on additive press and drags the remainder", () => {
			const { getByTestId } = setup({ selected: ["a", "b"] });

			fireEvent.mouseDown(getByTestId("w-a"), { shiftKey: true });

			expect(setSelection).toHaveBeenCalledWith(["b"]);
			expect(startDrag).toHaveBeenCalledWith(expect.anything(), [WIDGETS.b]);
		});

		it("does not start a drag when the additive press empties the selection", () => {
			const { getByTestId } = setup({ selected: ["a"] });

			fireEvent.mouseDown(getByTestId("w-a"), { ctrlKey: true });

			expect(setSelection).toHaveBeenCalledWith([]);
			expect(startDrag).not.toHaveBeenCalled();
		});

		it("does not let the widget press reach the canvas marquee", () => {
			const { getByTestId } = setup();

			fireEvent.mouseDown(getByTestId("w-a"));

			expect(startMarquee).not.toHaveBeenCalled();
		});
	});

	describe("canvas background", () => {
		it("clears the selection on a background click", () => {
			const { canvas } = setup({ selected: ["a"] });

			fireEvent.click(canvas);

			expect(clearSelection).toHaveBeenCalledTimes(1);
		});

		it("starts a marquee on a background mouse down with the current selection", () => {
			const { canvas } = setup({ selected: ["a"] });

			fireEvent.mouseDown(canvas, { shiftKey: true });

			expect(startMarquee).toHaveBeenCalledWith(expect.anything(), ["a"]);
		});

		it("does not swallow the next background click when no click followed the marquee", () => {
			jest.useFakeTimers();
			try {
				const { canvas } = setup({ selected: ["a"] });

				act(() => onMarqueeSelect([]));
				act(() => {
					jest.advanceTimersByTime(0);
				});
				fireEvent.click(canvas);

				expect(clearSelection).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});

		it("still ignores a click dispatched right after the marquee release", () => {
			jest.useFakeTimers();
			try {
				const { canvas } = setup({ selected: ["a"] });

				act(() => onMarqueeSelect(["a", "b"]));
				fireEvent.click(canvas);

				expect(clearSelection).not.toHaveBeenCalled();
				act(() => {
					jest.advanceTimersByTime(0);
				});
				fireEvent.click(canvas);
				expect(clearSelection).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});

		it("ignores the click that follows a marquee selection, once", () => {
			const { canvas } = setup({ selected: ["a"] });

			act(() => onMarqueeSelect(["a", "b"]));
			expect(setSelection).toHaveBeenCalledWith(["a", "b"]);

			fireEvent.click(canvas);
			expect(clearSelection).not.toHaveBeenCalled();

			fireEvent.click(canvas);
			expect(clearSelection).toHaveBeenCalledTimes(1);
		});
	});

	describe("read-only page (not editable, design view)", () => {
		it("still selects widgets but never starts a drag", () => {
			const { getByTestId } = setup({ editable: false });

			fireEvent.mouseDown(getByTestId("w-a"));

			expect(setSelection).toHaveBeenCalledWith(["a"]);
			expect(startDrag).not.toHaveBeenCalled();
		});

		it("still allows marquee selection and clearing", () => {
			const { canvas } = setup({ editable: false, selected: ["a"] });

			fireEvent.mouseDown(canvas);
			fireEvent.click(canvas);

			expect(startMarquee).toHaveBeenCalled();
			expect(clearSelection).toHaveBeenCalled();
		});

		it("opens no context menu", () => {
			const { canvas, getByTestId } = setup({ editable: false });

			fireEvent.contextMenu(canvas);
			fireEvent.contextMenu(getByTestId("w-a"));

			expect(mockOpenContextMenu).not.toHaveBeenCalled();
			expect(selectWidget).not.toHaveBeenCalled();
		});

		it("shows no resize handle and passes the read-only flag to the page panel", () => {
			const { getByTestId } = setup({ editable: false, selected: ["a"] });

			expect(getByTestId("w-a").dataset.handle).toBe("false");
			getByTestId("widget-panel");
		});

		it("flags the page panel read-only when nothing is selected", () => {
			const { getByTestId } = setup({ editable: false });

			expect(getByTestId("page-panel").dataset.readonly).toBe("true");
		});
	});

	describe("simulation", () => {
		it("neither selects, drags, marquees nor clears", () => {
			const { canvas, getByTestId } = setup({
				simulation: true,
				selected: ["a"],
			});

			fireEvent.mouseDown(getByTestId("w-b"));
			fireEvent.mouseDown(canvas);
			fireEvent.click(canvas);

			expect(setSelection).not.toHaveBeenCalled();
			expect(startDrag).not.toHaveBeenCalled();
			expect(startMarquee).not.toHaveBeenCalled();
			expect(clearSelection).not.toHaveBeenCalled();
		});

		it("hides the side panels", () => {
			const { queryByTestId } = setup({ simulation: true });

			expect(queryByTestId("page-panel")).toBeNull();
			expect(queryByTestId("objects-panel")).toBeNull();
		});
	});

	describe("editable design view", () => {
		it("opens the widget context menu and selects an unselected widget", () => {
			const { getByTestId } = setup({ selected: ["b"] });

			fireEvent.contextMenu(getByTestId("w-a"));

			expect(selectWidget).toHaveBeenCalledWith("a");
			expect(mockOpenContextMenu).toHaveBeenCalledWith(expect.anything(), {
				type: "widget",
				widgetId: "a",
			});
		});

		it("keeps the selection when the context menu targets a selected widget", () => {
			const { getByTestId } = setup({ selected: ["a", "b"] });

			fireEvent.contextMenu(getByTestId("w-a"));

			expect(selectWidget).not.toHaveBeenCalled();
		});

		it("opens the pane context menu on the background", () => {
			const { canvas } = setup();

			fireEvent.contextMenu(canvas);

			expect(mockOpenContextMenu).toHaveBeenCalledWith(expect.anything(), {
				type: "pane",
			});
		});
	});

	describe("selection side effects", () => {
		it("shows the resize handle and panels for a sole selected widget", () => {
			const { getByTestId } = setup({ selected: ["a"] });

			expect(getByTestId("w-a").dataset.handle).toBe("true");
			expect(getByTestId("widget-panel").textContent).toBe("a");
			getByTestId("events-pane");
			getByTestId("animations-pane");
		});

		it("shows no handle and a count for a multiple selection", () => {
			const { getByTestId, getByText, queryByTestId } = setup({
				selected: ["a", "b"],
			});

			expect(getByTestId("w-a").dataset.handle).toBe("false");
			expect(getByTestId("w-b").dataset.handle).toBe("false");
			getByText(/2 widgets/);
			expect(queryByTestId("events-pane")).toBeNull();
		});

		it.each([
			["fr", "2 widgets sélectionnés."],
			["en", "2 widgets selected."],
			["es", "2 widgets seleccionados."],
		] as [Locale, string][])(
			"words the multiple selection count in %s",
			(locale, expected) => {
				const { getByText } = setup({ selected: ["a", "b"], locale });

				getByText(expected);
			},
		);

		it("shows the page panel when nothing is selected", () => {
			const { getByTestId } = setup();

			getByTestId("page-panel");
		});
	});

	describe("drag preview", () => {
		it("applies the offset to the selected widgets of the group only", () => {
			const { getByTestId } = setup({ selected: ["a", "b"] });

			act(() => onDragPreview({ widgetIds: ["a", "b", "c"], dx: 12, dy: -4 }));

			expect(getByTestId("w-a").dataset.offset).toBe("12,-4");
			expect(getByTestId("w-b").dataset.offset).toBe("12,-4");
			expect(getByTestId("w-c").dataset.offset).toBe("");
		});

		it("does not offset a widget outside the dragged ids", () => {
			const { getByTestId } = setup({ selected: ["a", "b"] });

			act(() => onDragPreview({ widgetIds: ["a"], dx: 5, dy: 5 }));

			expect(getByTestId("w-a").dataset.offset).toBe("5,5");
			expect(getByTestId("w-b").dataset.offset).toBe("");
		});

		it("clears the offsets when the preview ends", () => {
			const { getByTestId } = setup({ selected: ["a"] });

			act(() => onDragPreview({ widgetIds: ["a"], dx: 5, dy: 5 }));
			act(() => onDragPreview(null));

			expect(getByTestId("w-a").dataset.offset).toBe("");
		});
	});
});
