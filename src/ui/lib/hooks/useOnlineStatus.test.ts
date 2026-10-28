/** @jest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import useOnlineStatus from "./useOnlineStatus";

function setOnLine(value: boolean) {
	Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

describe("useOnlineStatus", () => {
	afterEach(() => setOnLine(true));

	it("starts from navigator.onLine", () => {
		setOnLine(false);
		const { result } = renderHook(() => useOnlineStatus());

		expect(result.current).toBe(false);
	});

	it("follows the offline and online events", () => {
		setOnLine(true);
		const { result } = renderHook(() => useOnlineStatus());

		act(() => {
			setOnLine(false);
			window.dispatchEvent(new Event("offline"));
		});
		expect(result.current).toBe(false);

		act(() => {
			setOnLine(true);
			window.dispatchEvent(new Event("online"));
		});
		expect(result.current).toBe(true);
	});

	it("stops listening on unmount", () => {
		const remove = jest.spyOn(window, "removeEventListener");
		const { unmount } = renderHook(() => useOnlineStatus());

		unmount();

		expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
		expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
		remove.mockRestore();
	});
});
