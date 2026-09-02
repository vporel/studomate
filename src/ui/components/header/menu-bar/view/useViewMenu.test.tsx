/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { AppContextProvider } from "@/ui/components/AppContext";
import { i18nWrapper } from "@tests/utils/i18n";
import type { ReactNode } from "react";
import useViewMenu from "./useViewMenu";

const I18n = i18nWrapper();
const wrapper = ({ children }: { children: ReactNode }) => (
	<I18n>
		<AppContextProvider>{children}</AppContextProvider>
	</I18n>
);

describe("useViewMenu", () => {
	it("exposes the explorer toggle, checked when the explorer is visible", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });
		expect(result.current.id).toBe("view");
		expect(result.current.items[0][0].label).toBe("Explorateur");
		expect(result.current.items[0][0].checked).toBe(true);
	});

	it("toggles the explorer visibility when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(false);

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(true);
	});
});
