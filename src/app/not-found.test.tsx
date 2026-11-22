/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

let mockPathname = "/";
jest.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
}));

describe("NotFound", () => {
	afterEach(() => {
		document.documentElement.lang = "";
	});

	it("affiche le français et revient à / hors préfixe /en", () => {
		mockPathname = "/page-inconnue";

		render(<NotFound />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Page introuvable",
		);
		expect(screen.getByRole("link")).toHaveAttribute("href", "/");
		expect(document.documentElement.lang).toBe("fr");
	});

	it.each(["/en", "/en/page-inconnue"])(
		"affiche l'anglais et revient à /en pour %s",
		(pathname) => {
			mockPathname = pathname;

			render(<NotFound />);

			expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
				"Page not found",
			);
			expect(screen.getByRole("link")).toHaveAttribute("href", "/en");
			expect(document.documentElement.lang).toBe("en");
		},
	);

	it.each(["/es", "/es/pagina-desconocida"])(
		"affiche l'espagnol et revient à /es pour %s",
		(pathname) => {
			mockPathname = pathname;

			render(<NotFound />);

			expect(screen.getByRole("link")).toHaveAttribute("href", "/es");
			expect(document.documentElement.lang).toBe("es");
		},
	);

	it("ne prend pas pour l'anglais un chemin qui commence par /en sans en être le préfixe", () => {
		mockPathname = "/entreprise";

		render(<NotFound />);

		expect(document.documentElement.lang).toBe("fr");
	});
});
