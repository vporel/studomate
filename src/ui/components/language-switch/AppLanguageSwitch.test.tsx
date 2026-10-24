/**
 * @jest-environment jsdom
 */
import {
	getPreferredLocale,
	setPreferredLocale,
} from "@/persistence/preferences.storage";
import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { fireEvent, render, screen } from "@testing-library/react";
import AppLanguageSwitch from "./AppLanguageSwitch";

describe("AppLanguageSwitch", () => {
	beforeEach(() => localStorage.clear());

	it("change la langue de l'app et mémorise le choix", () => {
		setPreferredLocale("fr");
		render(
			<LocaleProvider>
				<AppLanguageSwitch />
			</LocaleProvider>,
		);
		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByRole("menuitem", { name: "English" }));

		expect(getPreferredLocale()).toBe("en");
		expect(screen.getByRole("button", { name: "Language" })).toHaveTextContent(
			"EN",
		);
	});
});
