/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import useHelpMenu from "./useHelpMenu";

describe("useHelpMenu", () => {
	const onShortcutsOpen = jest.fn();

	afterEach(() => jest.clearAllMocks());

	it("exposes the help menu structure with two items", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen));
		expect(result.current.id).toBe("help");
		expect(result.current.items).toHaveLength(1);
		expect(result.current.items[0]).toHaveLength(2);
		expect(result.current.items[0][0].label).toBe("Manuel utilisateur");
		expect(result.current.items[0][1].label).toBe("Raccourcis clavier");
	});

	it("opens the user manual in a new tab when clicked", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen));

		result.current.items[0][0].onClick?.();

		expect(openSpy).toHaveBeenCalledWith(
			"/manuel-utilisateur",
			"_blank",
			"noopener,noreferrer",
		);
		openSpy.mockRestore();
	});

	it("appelle onShortcutsOpen au clic sur 'Raccourcis clavier'", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen));

		act(() => result.current.items[0][1].onClick?.());

		expect(onShortcutsOpen).toHaveBeenCalledTimes(1);
	});
});
