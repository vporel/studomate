/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { getPreferredLocale } from "@/persistence/preferences.storage";
import PublicLanguageSwitch from "./PublicLanguageSwitch";

let mockPathname = "/about";
let mockParams: Record<string, string> = {};

jest.mock("@/i18n/navigation", () => ({
	...jest.requireActual("@/i18n/navigation"),
	usePathname: () => mockPathname,
}));
jest.mock("next/navigation", () => ({
	...jest.requireActual("next/navigation"),
	useParams: () => mockParams,
}));

function openMenu() {
	renderWithI18n(<PublicLanguageSwitch />);
	fireEvent.click(screen.getByRole("button"));
	return screen.getAllByRole("menuitem");
}

describe("PublicLanguageSwitch", () => {
	beforeEach(() => {
		localStorage.clear();
		mockPathname = "/about";
		mockParams = {};
	});

	it("propose chaque langue sur la page courante, avec le slug traduit", () => {
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/a-propos");
		expect(en).toHaveAttribute("href", "/en/about");
	});

	it("garde les liens de langue dans le DOM avant ouverture du menu", () => {
		renderWithI18n(<PublicLanguageSwitch />);

		const hrefs = screen
			.getAllByRole("menuitem", { hidden: true })
			.map((el) => el.getAttribute("href"));
		expect(hrefs).toEqual(["/fr/a-propos", "/en/about"]);
	});

	it("résout les paramètres d'une route dynamique (section du manuel)", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "grafcet" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/manuel-utilisateur/grafcet");
		expect(en).toHaveAttribute("href", "/en/user-manual/grafcet");
	});

	it("traduit le slug d'une section du manuel vers l'autre langue", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "depannage" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/manuel-utilisateur/depannage");
		expect(en).toHaveAttribute("href", "/en/user-manual/troubleshooting");
	});

	it("renvoie à l'accueil sur un slug de section inconnu dans la langue courante", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "troubleshooting" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr");
		expect(en).toHaveAttribute("href", "/en");
	});

	it("résout les paramètres d'une route dynamique (étape de formation)", () => {
		mockPathname = "/training/a2/[step]";
		mockParams = { locale: "en", step: "theory-edges" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/formations/a2/theory-edges");
		expect(en).toHaveAttribute("href", "/en/training/a2/theory-edges");
	});

	it("renvoie à l'accueil quand les paramètres de la route dynamique manquent", () => {
		mockPathname = "/training/a2/[step]";
		mockParams = { locale: "fr" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr");
		expect(en).toHaveAttribute("href", "/en");
	});

	it("mémorise la langue choisie pour /app et l'accueil", () => {
		const [, en] = openMenu();
		fireEvent.click(en);
		expect(getPreferredLocale()).toBe("en");
	});
});
