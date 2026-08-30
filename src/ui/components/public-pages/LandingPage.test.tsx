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
});
