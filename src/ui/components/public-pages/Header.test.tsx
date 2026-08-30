/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Header from "./Header";

describe("Header", () => {
	it("expose un CTA vers l'application", () => {
		render(<Header />);
		const cta = screen
			.getAllByRole("link", { name: /ouvrir l'application/i })
			.find((el) => el.getAttribute("href") === "/app");
		expect(cta).toBeDefined();
	});

	it("le logo renvoie vers l'accueil, pas vers l'app", () => {
		render(<Header />);
		const logoLink = screen.getByRole("link", { name: /studomate/i });
		expect(logoLink).toHaveAttribute("href", "/");
	});

	it("ouvre un menu avec les liens de navigation sur mobile", () => {
		render(<Header />);
		fireEvent.click(screen.getByRole("button", { name: /menu/i }));
		expect(
			screen.getByRole("menuitem", { name: /manuel/i }),
		).toHaveAttribute("href", "/manuel-utilisateur");
	});
});
