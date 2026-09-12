/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { AppContextProvider, useAppContext } from "@/ui/components/AppContext";
import type { ReactNode } from "react";
import usePaneMenuItems from "./usePaneMenuItems";

const I18n = i18nWrapper();
const wrapper = ({ children }: { children: ReactNode }) => (
	<I18n>
		<AppContextProvider>{children}</AppContextProvider>
	</I18n>
);

describe("usePaneMenuItems", () => {
	function setup() {
		return renderHook(
			() => ({ items: usePaneMenuItems(), appContext: useAppContext() }),
			{ wrapper },
		);
	}

	it("contient un seul groupe d'items", () => {
		const { result } = setup();

		expect(result.current.items()).toHaveLength(1);
	});

	it("expose un item 'Masquer l'explorateur'", () => {
		const { result } = setup();
		const items = result.current.items();

		expect(items[0][0].label).toBe("Masquer l'explorateur");
	});

	it("masque l'explorateur au clic", () => {
		const { result } = setup();

		act(() => result.current.items()[0][0].onClick?.());

		expect(result.current.appContext.viewAppearance.explorer).toBe(false);
	});
});
