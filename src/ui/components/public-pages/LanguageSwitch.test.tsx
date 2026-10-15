/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import LanguageSwitch from "./LanguageSwitch";

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
	renderWithI18n(<LanguageSwitch />);
	fireEvent.click(screen.getByRole("button"));
	return screen.getAllByRole("menuitem");
}

describe("LanguageSwitch", () => {
	beforeEach(() => {
		mockPathname = "/about";
		mockParams = {};
	});

	it("propose chaque langue sur la page courante, avec le slug traduit", () => {
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/a-propos");
		expect(en).toHaveAttribute("href", "/en/about");
	});

	it("garde les liens de langue dans le DOM avant ouverture du menu", () => {
		renderWithI18n(<LanguageSwitch />);

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

	it("résout les paramètres d'une route dynamique (étape de formation)", () => {
		mockPathname = "/training/a2/[step]";
		mockParams = { locale: "en", step: "theory-edges" };
		const [fr, en] = openMenu();
		expect(fr).toHaveAttribute("href", "/fr/formations/a2/theory-edges");
		expect(en).toHaveAttribute("href", "/en/training/a2/theory-edges");
	});
});
