/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import type { InputBehavior } from "@/schemas/variable/input-behavior";
import useFormatInputBehavior from "./useFormatInputBehavior";

function format(behavior: InputBehavior | null | undefined) {
	const { result } = renderHook(() => useFormatInputBehavior(), {
		wrapper: i18nWrapper(),
	});
	return result.current(behavior);
}

describe("useFormatInputBehavior", () => {
	it.each([null, undefined])("returns an empty string for %s", (behavior) => {
		expect(format(behavior)).toBe("");
	});

	it.each([
		["push-button-no", "Bouton poussoir NO"],
		["push-button-nc", "Bouton poussoir NF"],
		["toggle-switch-no", "Commutateur NO"],
		["toggle-switch-nc", "Commutateur NF"],
	] as const)("labels %s", (kind, label) => {
		expect(format({ kind, params: null })).toBe(label);
	});

	it("includes the bounds for a slider", () => {
		expect(format({ kind: "slider", params: { min: 5, max: 50 } })).toBe(
			"Curseur (5 … 50)",
		);
	});

	it("keeps a stable function identity across renders", () => {
		const { result, rerender } = renderHook(() => useFormatInputBehavior(), {
			wrapper: i18nWrapper(),
		});
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});
});
