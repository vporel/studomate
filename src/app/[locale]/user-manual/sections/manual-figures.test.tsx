/**
 * @jest-environment jsdom
 */
import { existsSync } from "fs";
import { join } from "path";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import en from "@/i18n/messages/en/manual.json";
import fr from "@/i18n/messages/fr/manual.json";
import GrafcetSection from "./GrafcetSection";
import HardwareSection from "./HardwareSection";
import LadderSection from "./LadderSection";
import Scene3dSection from "./Scene3dSection";
import SimulationSection from "./SimulationSection";

const FIGURES = [
	{
		name: "symboles du GRAFCET (fr)",
		ui: () => renderWithI18n(<GrafcetSection selected="grafcet-steps" />),
		alt: fr.grafcet.symbolsFigureAlt,
		file: "grafcet/grafcet-symbols-fr.svg",
	},
	{
		name: "symboles du GRAFCET (en)",
		ui: () =>
			renderWithI18n(<GrafcetSection selected="grafcet-steps" />, {
				locale: "en",
			}),
		alt: en.grafcet.symbolsFigureAlt,
		file: "grafcet/grafcet-symbols-en.svg",
	},
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
		name: "renvoi tenant / aboutissant",
		ui: () => renderWithI18n(<GrafcetSection selected="grafcet-referrals" />),
		alt: fr.grafcet.referralsFigureAlt,
		file: "grafcet/referrals.svg",
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
		name: "bloc temporisation et ses broches",
		ui: () => renderWithI18n(<LadderSection selected="ladder-blocks" />),
		alt: fr.ladder.timerBlockFigureAlt,
		file: "ladder/timer-block.svg",
	},
	{
		name: "chronogrammes TON / TOF / TP",
		ui: () => renderWithI18n(<LadderSection selected="ladder-blocks" />),
		alt: fr.ladder.timersFigureAlt,
		file: "ladder/timers.svg",
	},
	{
		name: "réseau ET / OU",
		ui: () => renderWithI18n(<LadderSection selected="ladder-connections" />),
		alt: fr.ladder.connectionsFigureAlt,
		file: "ladder/connections.svg",
	},
	{
		name: "cycle automate (fr)",
		ui: () => renderWithI18n(<SimulationSection selected="simulation-running" />),
		alt: fr.simulation.cycleOrderFigureAlt,
		file: "simulation/scan-cycle-fr.svg",
	},
	{
		name: "cycle automate (en)",
		ui: () =>
			renderWithI18n(<SimulationSection selected="simulation-running" />, {
				locale: "en",
			}),
		alt: en.simulation.cycleOrderFigureAlt,
		file: "simulation/scan-cycle-en.svg",
	},
	{
		name: "câblage d'un bouton sur l'Arduino",
		ui: () => renderWithI18n(<HardwareSection />),
		alt: fr.hardware.buttonFigureAlt,
		file: "hardware/button-pull-up.svg",
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
