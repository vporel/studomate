/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import ToolboxCell from "./ToolboxCell";

describe("ToolboxCell", () => {
	it("affiche ses enfants dans une cellule de 30×30", () => {
		render(
			<ToolboxCell>
				<span>dessin</span>
			</ToolboxCell>,
		);

		expect(screen.getByText("dessin").parentElement).toHaveStyle({
			width: "30px",
			height: "30px",
		});
	});
});
