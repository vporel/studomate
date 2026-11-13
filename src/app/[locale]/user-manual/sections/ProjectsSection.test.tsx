/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ProjectsSection from "./ProjectsSection";

describe("ProjectsSection", () => {
	it("links the teachers page after the lab exercise scenario", () => {
		renderWithI18n(<ProjectsSection />);

		expect(
			screen.getByRole("link", {
				name: "Enseigner le GRAFCET et le Ladder avec Studomate",
			}),
		).toHaveAttribute("href", "/enseignants");
	});
});
