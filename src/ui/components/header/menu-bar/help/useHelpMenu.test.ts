/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { feedbackStore } from "@/ui/stores/feedback/feedback.store";
import { whatsNewStore } from "@/ui/stores/whats-new/whats-new.store";
import useHelpMenu from "./useHelpMenu";

const startAppTour = jest.fn();
jest.mock("@/ui/components/product-tour/app-tour/useStartAppTour", () => ({
	__esModule: true,
	default: () => startAppTour,
}));

describe("useHelpMenu", () => {
	const onShortcutsOpen = jest.fn();

	afterEach(() => jest.clearAllMocks());

	it("exposes the help menu structure", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});
		expect(result.current.id).toBe("help");
		expect(result.current.items).toHaveLength(2);
		expect(result.current.items[0]).toHaveLength(5);
		expect(result.current.items[0][0].label).toBe("Manuel utilisateur");
		expect(result.current.items[0][1].label).toBe("Formations");
		expect(result.current.items[0][2].label).toBe("Raccourcis clavier");
		expect(result.current.items[0][3].label).toBe("Revoir la visite guidée");
		expect(result.current.items[0][4].label).toBe("Nouveautés");
		expect(result.current.items[1]).toHaveLength(2);
		expect(result.current.items[1][0].label).toBe("Donner un avis");
		expect(result.current.items[1][1].label).toBe("Signaler un problème");
	});

	it("opens the what's new modal when 'Nouveautés' is clicked", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		act(() => result.current.items[0][4].onClick?.());

		expect(whatsNewStore.getState().visible).toBe(true);
		whatsNewStore.getState().close();
	});

	it("opens the feedback box when 'Donner un avis' is clicked", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		result.current.items[1][0].onClick?.();

		expect(feedbackStore.getState().source).toBe("menu");
		feedbackStore.getState().close();
	});

	it("opens the contact page on the problem topic in a new tab when 'Signaler un problème' is clicked", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		result.current.items[1][1].onClick?.();

		expect(openSpy).toHaveBeenCalledWith(
			"/contact?topic=problem",
			"_blank",
			"noopener",
		);
		openSpy.mockRestore();
	});

	it("opens the English contact page for an English interface", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper("en"),
		});

		result.current.items[1][1].onClick?.();

		expect(openSpy).toHaveBeenCalledWith(
			"/en/contact?topic=problem",
			"_blank",
			"noopener",
		);
		openSpy.mockRestore();
	});

	it("starts the guided tour when 'Revoir la visite guidée' is clicked", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		result.current.items[0][3].onClick?.();

		expect(startAppTour).toHaveBeenCalledTimes(1);
	});

	it("opens the user manual in a new tab when clicked", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		result.current.items[0][0].onClick?.();

		expect(openSpy).toHaveBeenCalledWith(
			"/manuel-utilisateur",
			"_blank",
			"noopener,noreferrer",
		);
		openSpy.mockRestore();
	});

	it("opens the training page in a new tab when clicked", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		result.current.items[0][1].onClick?.();

		expect(openSpy).toHaveBeenCalledWith(
			"/formations",
			"_blank",
			"noopener,noreferrer",
		);
		openSpy.mockRestore();
	});

	it("appelle onShortcutsOpen au clic sur 'Raccourcis clavier'", () => {
		const { result } = renderHook(() => useHelpMenu(onShortcutsOpen), {
			wrapper: i18nWrapper(),
		});

		act(() => result.current.items[0][2].onClick?.());

		expect(onShortcutsOpen).toHaveBeenCalledTimes(1);
	});
});
