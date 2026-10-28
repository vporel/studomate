/**
 * @jest-environment jsdom
 */
import type { Locale } from "@/i18n/config";
import { setPreferredLocale } from "@/persistence/preferences.storage";
import { renderWithI18n } from "@tests/utils/i18n";
import PreferredLocaleRedirect from "./PreferredLocaleRedirect";

const replace = jest.fn();
jest.mock("@/i18n/navigation", () => ({
	...jest.requireActual("@/i18n/navigation"),
	useRouter: () => ({ replace }),
}));

function renderOn(locale: Locale) {
	renderWithI18n(<PreferredLocaleRedirect />, { locale });
}

describe("PreferredLocaleRedirect", () => {
	beforeEach(() => {
		replace.mockClear();
		localStorage.clear();
	});

	it("redirige l'accueil français vers l'accueil anglais si l'anglais est mémorisé", () => {
		setPreferredLocale("en");
		renderOn("fr");
		expect(replace).toHaveBeenCalledWith("/", { locale: "en" });
	});

	it("ne redirige pas sans préférence mémorisée", () => {
		renderOn("fr");
		expect(replace).not.toHaveBeenCalled();
	});

	it("ne redirige pas quand la préférence est déjà le français", () => {
		setPreferredLocale("fr");
		renderOn("fr");
		expect(replace).not.toHaveBeenCalled();
	});

	it("ne touche pas à une URL préfixée explicite, même avec une autre préférence", () => {
		setPreferredLocale("fr");
		renderOn("en");
		expect(replace).not.toHaveBeenCalled();
	});
});
