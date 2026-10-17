/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import LegacyHashRedirect from "./LegacyHashRedirect";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
}));

function renderWithHash(hash: string, locale: "fr" | "en" = "fr") {
	window.location.hash = hash;
	render(<LegacyHashRedirect />, { wrapper: i18nWrapper(locale) });
}

describe("LegacyHashRedirect", () => {
	afterEach(() => {
		replace.mockClear();
		window.location.hash = "";
	});

	it("redirige un ancien lien de section vers sa page", () => {
		renderWithHash("#grafcet");
		expect(replace).toHaveBeenCalledWith("/manuel-utilisateur/grafcet");
	});

	it("redirige un ancien lien de sous-section vers l'ancre de la page parente", () => {
		renderWithHash("#hmi-events", "en");
		expect(replace).toHaveBeenCalledWith("/en/user-manual/hmi#hmi-events");
	});

	it("ne fait rien sans fragment, pour l'introduction ou pour un id inconnu", () => {
		renderWithHash("");
		renderWithHash("#intro");
		renderWithHash("#nope");
		expect(replace).not.toHaveBeenCalled();
	});
});
