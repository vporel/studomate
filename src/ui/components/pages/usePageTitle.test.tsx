/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { SCENE3D_VIEW_PAGE_DATA } from "@/ui/stores/project/pages-data";
import { usePageTitle } from "./usePageTitle";

describe("usePageTitle", () => {
	it.each([
		["fr", "Scène 3D"],
		["en", "3D scene"],
	] as const)("titles the page of the 3D scene in %s", (locale, title) => {
		const { result } = renderHook(() => usePageTitle(), {
			wrapper: i18nWrapper(locale),
		});
		expect(result.current(SCENE3D_VIEW_PAGE_DATA)).toBe(title);
	});

	it.each([
		["fr", "Simulation HMI"],
		["en", "HMI simulation"],
		["es", "Simulación HMI"],
	] as const)("titles the HMI simulation tab in %s", (locale, title) => {
		const { result } = renderHook(() => usePageTitle(), {
			wrapper: i18nWrapper(locale),
		});
		expect(
			result.current({
				id: "hmi-simulation",
				type: "hmi-simulation",
				title: "Simulation HMI",
			}),
		).toBe(title);
	});

	it("keeps the name of a program as its title", () => {
		const { result } = renderHook(() => usePageTitle(), {
			wrapper: i18nWrapper("fr"),
		});
		expect(result.current({ id: "g1", type: "grafcet", title: "Cycle" })).toBe(
			"Cycle",
		);
	});
});
