/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import TintedPaper from "./TintedPaper";

describe("TintedPaper", () => {
	it("renders its children", () => {
		render(<TintedPaper>Contenu</TintedPaper>);

		expect(screen.getByText("Contenu")).toBeTruthy();
	});

	it("merges the caller's sx with the tinted background", () => {
		render(<TintedPaper sx={{ p: 2 }}>Contenu</TintedPaper>);

		const style = getComputedStyle(screen.getByText("Contenu"));
		expect(style.padding).toBe("16px");
		expect(style.backgroundColor).not.toBe("");
	});
});
