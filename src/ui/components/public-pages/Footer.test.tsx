/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import Footer from "./Footer";

describe("Footer", () => {
	it("expose les liens légaux", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByRole("link", { name: /mentions légales/i }),
		).toHaveAttribute("href", "/mentions-legales");
		expect(
			screen.getByRole("link", { name: /politique de confidentialité/i }),
		).toHaveAttribute("href", "/politique-de-confidentialite");
	});

	it("affiche l'année courante dans le copyright", () => {
		renderWithI18n(<Footer />);
		expect(
			screen.getByText(new RegExp(`© ${new Date().getFullYear()} Studomate`)),
		).toBeInTheDocument();
	});

	it("ouvre le mailto de signalement sans naviguer", () => {
		const open = jest.spyOn(window, "open").mockImplementation(() => null);
		renderWithI18n(<Footer />);
		fireEvent.click(screen.getByText(/signaler un problème/i));
		expect(open).toHaveBeenCalledWith(
			expect.stringMatching(/^mailto:/),
			"_blank",
			"noopener,noreferrer",
		);
		open.mockRestore();
	});
});
