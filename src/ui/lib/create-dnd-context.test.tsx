/** @jest-environment jsdom */
import { act, render, renderHook } from "@testing-library/react";
import React from "react";
import createDndContext from "@/ui/lib/create-dnd-context";

describe("createDndContext", () => {
	it("exposes an empty default value outside a Provider", () => {
		const { useDnD } = createDndContext<string>();
		const { result } = renderHook(() => useDnD());

		expect(result.current.draggedItem).toBeNull();
		expect(() => result.current.setDraggedItem("a")).not.toThrow();
		expect(result.current.draggedItem).toBeNull();
	});

	it("updates the value through setDraggedItem inside a Provider", () => {
		const { Provider, useDnD } = createDndContext<string>();
		const { result } = renderHook(() => useDnD(), { wrapper: Provider });

		act(() => result.current.setDraggedItem("step"));
		expect(result.current.draggedItem).toBe("step");

		act(() => result.current.setDraggedItem(null));
		expect(result.current.draggedItem).toBeNull();
	});

	it("keeps the same value reference while draggedItem is unchanged", () => {
		const { Provider, useDnD } = createDndContext<string>();
		const seen: unknown[] = [];
		const Consumer = () => {
			seen.push(useDnD());
			return null;
		};
		const { rerender } = render(
			<Provider>
				<Consumer />
			</Provider>,
		);
		rerender(
			<Provider>
				<Consumer />
			</Provider>,
		);

		expect(seen.length).toBeGreaterThanOrEqual(2);
		expect(seen[seen.length - 1]).toBe(seen[0]);
	});

	it("keeps contexts from two factory calls independent", () => {
		const a = createDndContext<string>();
		const b = createDndContext<number>();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<a.Provider>
				<b.Provider>{children}</b.Provider>
			</a.Provider>
		);
		const { result } = renderHook(
			() => ({ a: a.useDnD(), b: b.useDnD() }),
			{ wrapper },
		);

		act(() => result.current.a.setDraggedItem("x"));

		expect(result.current.a.draggedItem).toBe("x");
		expect(result.current.b.draggedItem).toBeNull();
	});
});
