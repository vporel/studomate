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
});
