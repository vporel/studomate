/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import Footer from "./Footer";

describe("Footer", () => {
	it("links « Signaler un problème » to the contact page on the problem topic", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByRole("link", { name: "Signaler un problème" }),
		).toHaveAttribute("href", "/contact?topic=problem");
	});

	it("expose les liens légaux", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByRole("link", { name: /mentions légales/i }),
		).toHaveAttribute("href", "/mentions-legales");
		expect(
			screen.getByRole("link", { name: /politique de confidentialité/i }),
		).toHaveAttribute("href", "/politique-de-confidentialite");
	});

	it("expose le glossaire parmi les ressources", () => {
		renderWithI18n(<Footer />);
		expect(screen.getByRole("link", { name: "Glossaire" })).toHaveAttribute(
			"href",
			"/formations/glossaire",
		);
	});

	it("expose la page enseignants parmi les ressources", () => {
		renderWithI18n(<Footer />);
		expect(screen.getByRole("link", { name: "Enseignants" })).toHaveAttribute(
			"href",
			"/enseignants",
		);
	});

	it("expose un lien vers le site de l'auteur", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByRole("link", { name: "Vivian NKOUANANG" }),
		).toHaveAttribute("href", "https://www.vporel.com");
	});

	it("affiche l'année courante dans le copyright", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByText(new RegExp(`© ${new Date().getFullYear()} Studomate`)),
		).toBeInTheDocument();
	});
});
