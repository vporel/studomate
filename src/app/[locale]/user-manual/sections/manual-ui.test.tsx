/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ManualFigure, ManualList } from "./manual-ui";

describe("ManualList", () => {
	it("rend un élément de liste par chaîne", () => {
		render(<ManualList items={["un", "deux"]} />);
		expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
			["un", "deux"],
		);
	});
});

describe("ManualFigure", () => {
	it("affiche l'image avec sa source et son texte alternatif", () => {
		render(<ManualFigure src="/user-manual/x.svg" alt="Schéma" width={300} />);
		const img = screen.getByRole("img", { name: "Schéma" });
		expect(img).toHaveAttribute("src", "/user-manual/x.svg");
	});

	it("limite la largeur à celle de la page", () => {
		render(<ManualFigure src="/a.svg" alt="A" width={500} />);
		expect(screen.getByRole("img", { name: "A" })).toHaveStyle({
			maxWidth: "100%",
		});
	});
});
