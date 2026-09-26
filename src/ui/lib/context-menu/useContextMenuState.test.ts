/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { RefObject } from "react";
import useContextMenuState from "./useContextMenuState";

type Target = { type: "pane" } | { type: "item"; id: string };

const PANE: Target = { type: "pane" };

function createRef(rect: Partial<DOMRect>): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div");
	div.getBoundingClientRect = () => rect as DOMRect;
	return { current: div };
}

describe("useContextMenuState", () => {
	it("est masqué par défaut, sur l'élément initial", () => {
		const { result } = renderHook(() =>
			useContextMenuState<Target>(createRef({ left: 0, top: 0 }), PANE),
		);

		expect(result.current.visible).toBe(false);
		expect(result.current.element).toEqual(PANE);
		expect(result.current.position).toEqual({ x: 0, y: 0 });
	});

	it("s'ouvre à une position relative au conteneur, sur l'élément ciblé", () => {
		const ref = createRef({ left: 10, top: 20 });
		const { result } = renderHook(() => useContextMenuState<Target>(ref, PANE));
		const element: Target = { type: "item", id: "a" };

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

	it("se ferme en conservant le dernier élément", () => {
		const ref = createRef({ left: 0, top: 0 });
		const { result } = renderHook(() => useContextMenuState<Target>(ref, PANE));
		const element: Target = { type: "item", id: "a" };

		act(() => {
			result.current.openContextMenu({ clientX: 5, clientY: 5 } as any, element);
		});
		act(() => {
			result.current.closeContextMenu();
		});

		expect(result.current.visible).toBe(false);
		expect(result.current.element).toEqual(element);
	});

	it("conserve l'identité des callbacks d'un rendu à l'autre", () => {
		const ref = createRef({ left: 0, top: 0 });
		const { result, rerender } = renderHook(() =>
			useContextMenuState<Target>(ref, PANE),
		);
		const { openContextMenu, closeContextMenu } = result.current;

		rerender();

		expect(result.current.openContextMenu).toBe(openContextMenu);
		expect(result.current.closeContextMenu).toBe(closeContextMenu);
	});
});
