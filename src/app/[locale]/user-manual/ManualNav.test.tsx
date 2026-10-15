/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ManualNav from "./ManualNav";

describe("ManualNav", () => {
	it("affiche les sections de premier niveau du plan (libellés traduits)", () => {
		renderWithI18n(<ManualNav />);
		expect(screen.getByText("Introduction")).toBeInTheDocument();
		expect(screen.getByText("Grafcet")).toBeInTheDocument();
		expect(screen.getByText("Interfaces HMI")).toBeInTheDocument();
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("déplie une section au clic et expose ses sous-sections", () => {
		renderWithI18n(<ManualNav />);
		expect(screen.queryByText("Renvois")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("Grafcet"));
		expect(screen.getByText("Renvois")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Renvois" })).toHaveAttribute(
			"href",
			"/manuel-utilisateur/grafcet#grafcet-referrals",
		);
	});

	it("déplie la section sélectionnée dès le premier rendu", () => {
		renderWithI18n(<ManualNav selected="ladder" />);
		expect(screen.getByText("Blocs")).toBeInTheDocument();
	});

	it("lie chaque section à sa page, l'introduction à l'URL de base du manuel", () => {
		renderWithI18n(<ManualNav selected="intro" />);
		expect(screen.getByRole("link", { name: "Introduction" })).toHaveAttribute(
			"href",
			"/manuel-utilisateur",
		);
		expect(screen.getByRole("link", { name: "Variables" })).toHaveAttribute(
			"href",
			"/manuel-utilisateur/variables",
		);
	});

	it("préfixe les liens avec la langue anglaise", () => {
		renderWithI18n(<ManualNav />, { locale: "en" });
		expect(screen.getByRole("link", { name: "Variables" })).toHaveAttribute(
			"href",
			"/en/user-manual/variables",
		);
	});
});
