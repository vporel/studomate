/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import fr from "@/i18n/messages/fr/manual.json";
import LimitsSection from "./LimitsSection";

const groups = fr.limits.groups;

describe("LimitsSection", () => {
	it("porte l'ancre de la section et son titre", () => {
		const { container } = renderWithI18n(<LimitsSection />);
		expect(container.querySelector("section#limits")).not.toBeNull();
		expect(
			screen.getByRole("heading", { level: 2, name: fr.limits.title }),
		).toBeInTheDocument();
	});

	it("rend un titre par groupe de limites", () => {
		renderWithI18n(<LimitsSection />);
		expect(
			screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
		).toEqual(groups.map((g) => g.title));
	});

	it("rend toutes les limites de chaque groupe", () => {
		renderWithI18n(<LimitsSection />);
		const total = groups.reduce((sum, g) => sum + g.items.length, 0);
		expect(screen.getAllByRole("listitem")).toHaveLength(total);
	});
});
