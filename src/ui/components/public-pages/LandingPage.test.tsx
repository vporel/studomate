/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { APP_REPO_URL } from "@/app-info";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
	it("propose au moins un CTA vers /app", () => {
		render(<LandingPage />);
		const appLinks = screen
			.getAllByRole("link")
			.filter((el) => el.getAttribute("href") === "/app");
		expect(appLinks.length).toBeGreaterThan(0);
	});

	it("renvoie vers le dépôt GitHub", () => {
		render(<LandingPage />);
		expect(
			screen.getByRole("link", { name: /voir sur github/i }),
		).toHaveAttribute("href", APP_REPO_URL);
	});

	it("affiche la section des exemples", () => {
		render(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /des exemples pour démarrer/i }),
		).toBeInTheDocument();
	});

	it("met en avant le positionnement tout-en-un et la friction zéro", () => {
		render(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /pourquoi studomate/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/friction zéro/i)).toBeInTheDocument();
		expect(screen.getByText(/tout-en-un/i)).toBeInTheDocument();
	});

	it("affiche l'argument de pérennité et la licence AGPL", () => {
		render(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /vos projets vous appartiennent/i }),
		).toBeInTheDocument();
		expect(screen.getAllByText(/AGPL v3/i).length).toBeGreaterThan(0);
		expect(screen.queryByText(/licence MIT/i)).not.toBeInTheDocument();
	});

	it("affiche la mention vie privée", () => {
		render(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /pensé pour la vie privée/i }),
		).toBeInTheDocument();
	});
});
