/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import mitt from "mitt";
import useContextMenuBus from "./useContextMenuBus";

type Events = { show: { x: number }; hide: void; other: string };

describe("useContextMenuBus", () => {
	it("forwards show and hide events to the handlers", () => {
		const events = mitt<Events>();
		const onShow = jest.fn();
		const hide = jest.fn();
		renderHook(() => useContextMenuBus(events, onShow, hide));

		events.emit("show", { x: 3 });
		events.emit("hide");

		expect(onShow).toHaveBeenCalledWith({ x: 3 });
		expect(hide).toHaveBeenCalledTimes(1);
	});

	it("unsubscribes on unmount", () => {
		const events = mitt<Events>();
		const onShow = jest.fn();
		const hide = jest.fn();
		const { unmount } = renderHook(() =>
			useContextMenuBus(events, onShow, hide),
		);
		unmount();

		events.emit("show", { x: 1 });
		events.emit("hide");

		expect(onShow).not.toHaveBeenCalled();
		expect(hide).not.toHaveBeenCalled();
	});

	it("resubscribes with the new handler when it changes", () => {
		const events = mitt<Events>();
		const first = jest.fn();
		const second = jest.fn();
		const hide = jest.fn();
		const { rerender } = renderHook(
			({ onShow }) => useContextMenuBus(events, onShow, hide),
			{ initialProps: { onShow: first } },
		);
		rerender({ onShow: second });

		events.emit("show", { x: 2 });

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith({ x: 2 });
	});
});
