/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PageTitle from "./PageTitle";

describe("PageTitle", () => {
	it("rend son contenu dans un titre de niveau 1", () => {
		render(<PageTitle>Mentions légales</PageTitle>);

		expect(
			screen.getByRole("heading", { level: 1, name: "Mentions légales" }),
		).toBeInTheDocument();
	});

	it("garde l'aspect sans exposer de titre avec as=\"p\"", () => {
		render(<PageTitle as="p">Module A1</PageTitle>);

		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
		expect(screen.getByText("Module A1").tagName).toBe("P");
	});
});
