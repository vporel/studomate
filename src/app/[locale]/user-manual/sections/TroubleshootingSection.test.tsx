/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import fr from "@/i18n/messages/fr/manual.json";
import TroubleshootingSection from "./TroubleshootingSection";

const entries = fr.troubleshooting.entries;

describe("TroubleshootingSection", () => {
	it("porte l'ancre de la section et son titre", () => {
		const { container } = renderWithI18n(<TroubleshootingSection />);
		expect(container.querySelector("section#troubleshooting")).not.toBeNull();
		expect(
			screen.getByRole("heading", { level: 2, name: fr.troubleshooting.title }),
		).toBeInTheDocument();
	});

	it("rend un titre par symptôme", () => {
		renderWithI18n(<TroubleshootingSection />);
		const headings = screen.getAllByRole("heading", { level: 3 });
		expect(headings.map((h) => h.textContent)).toEqual(
			entries.map((e) => e.title),
		);
	});

	it("rend tous les éléments de liste de chaque symptôme", () => {
		renderWithI18n(<TroubleshootingSection />);
		const total = entries.reduce((sum, e) => sum + e.items.length, 0);
		expect(screen.getAllByRole("listitem")).toHaveLength(total);
	});

	it("n'affiche le paragraphe de conclusion que pour les symptômes qui en ont un", () => {
		renderWithI18n(<TroubleshootingSection />);
		for (const entry of entries) {
			const outro = (entry as { outro?: string }).outro;
			if (outro) expect(screen.getByText(outro)).toBeInTheDocument();
		}
		const withoutOutro = entries.filter(
			(e) => !(e as { outro?: string }).outro,
		);
		expect(withoutOutro.length).toBeGreaterThan(0);
	});
});
