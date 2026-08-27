/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { RefObject } from "react";
import useExplorerContextMenu from "./useExplorerContextMenu";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";

function createRef(rect: Partial<DOMRect>): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div");
	div.getBoundingClientRect = () => rect as DOMRect;
	return { current: div };
}

describe("useExplorerContextMenu", () => {
	it("is hidden by default, targeting the pane", () => {
		const { result } = renderHook(() =>
			useExplorerContextMenu(createRef({ left: 0, top: 0 })),
		);
		expect(result.current.visible).toBe(false);
		expect(result.current.element).toEqual({ type: "pane" });
	});

	it("opens the context menu at a position relative to the explorer", () => {
		const ref = createRef({ left: 10, top: 20 });
		const { result } = renderHook(() => useExplorerContextMenu(ref));
		const element: ExplorerContextMenuElement = { type: "pane" };

		act(() => {
			result.current.openContextMenu(
				{ clientX: 50, clientY: 70 } as any,
				element,
			);
		});

		expect(result.current.visible).toBe(true);
		expect(result.current.element).toEqual(element);
		expect(result.current.position).toEqual({ x: 40, y: 50 });
	});

	it("closes the context menu", () => {
		const ref = createRef({ left: 0, top: 0 });
		const { result } = renderHook(() => useExplorerContextMenu(ref));

		act(() => {
			result.current.openContextMenu({ clientX: 5, clientY: 5 } as any, {
				type: "pane",
			});
		});
		act(() => {
			result.current.closeContextMenu();
		});

		expect(result.current.visible).toBe(false);
	});
});
