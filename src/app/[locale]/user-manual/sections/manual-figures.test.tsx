/**
 * @jest-environment jsdom
 */
import { existsSync } from "fs";
import { join } from "path";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import fr from "@/i18n/messages/fr/manual.json";
import GrafcetSection from "./GrafcetSection";
import LadderSection from "./LadderSection";
import Scene3dSection from "./Scene3dSection";

const FIGURES = [
	{
		name: "étape initiale, transition et action",
		ui: () => renderWithI18n(<GrafcetSection selected="grafcet-steps" />),
		alt: fr.grafcet.stepsFigureAlt,
		file: "grafcet/steps.svg",
	},
	{
		name: "jonctions",
		ui: () => renderWithI18n(<GrafcetSection selected="grafcet-junctions" />),
		alt: fr.grafcet.junctionsFigureAlt,
		file: "grafcet/junctions.svg",
	},
	{
		name: "contacts",
		ui: () => renderWithI18n(<LadderSection selected="ladder-contacts" />),
		alt: fr.ladder.contactsFigureAlt,
		file: "ladder/contacts.svg",
	},
	{
		name: "bobines",
		ui: () => renderWithI18n(<LadderSection selected="ladder-coils" />),
		alt: fr.ladder.coilsFigureAlt,
		file: "ladder/coils.svg",
	},
	{
		name: "scène 3D du tri de caisses",
		ui: () => renderWithI18n(<Scene3dSection />),
		alt: fr.scene3d.cartonSortingFigureAlt,
		file: "scene-3d/scene-3d-1.png",
	},
];

describe("figures du manuel", () => {
	it.each(FIGURES)("affiche la figure « $name » avec son texte alternatif", ({ ui, alt, file }) => {
		ui();
		const img = screen.getByRole("img", { name: alt });
		expect(img).toHaveAttribute("src", `/user-manual/${file}`);
	});

	it.each(FIGURES)("le fichier de la figure « $name » existe dans public/", ({ file }) => {
		expect(
			existsSync(join(process.cwd(), "public/user-manual", file)),
		).toBe(true);
	});
});
