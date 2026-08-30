/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { AppMenuType } from "./app-menu-bar";

const makeMenu = (id: string, label: string): AppMenuType => ({
	id,
	label,
	items: [[{ label: `${label} — action`, onClick: jest.fn() }]],
});

const fileMenu = makeMenu("file", "Fichier");
const projectMenu = makeMenu("project", "Projet");
const editMenu = makeMenu("edit", "Édition");
const viewMenu = makeMenu("view", "Affichage");
const helpMenu = makeMenu("help", "Aide");

jest.mock("./file/useFileMenu", () => ({ __esModule: true, default: () => fileMenu }));
jest.mock("./project/useProjectMenu", () => ({ __esModule: true, default: () => projectMenu }));
jest.mock("./edit/useEditMenu", () => ({ __esModule: true, default: () => editMenu }));
jest.mock("./view/useViewMenu", () => ({ __esModule: true, default: () => viewMenu }));
jest.mock("./help/useHelpMenu", () => ({ __esModule: true, default: () => helpMenu }));

const stub = { __esModule: true, default: () => null };
jest.mock("@/ui/components/header/title-bar/AnalyseButton", () => stub);
jest.mock("@/ui/components/header/title-bar/ProjectModeSwitcher", () => stub);
jest.mock("@/ui/components/header/title-bar/SimulationModeSelect", () => stub);
jest.mock("@/ui/components/header/title-bar/SimulationControls", () => stub);
jest.mock("./help/ShortcutsModal", () => stub);

import AppMenuBar from "./AppMenuBar";

const title = (name: string) =>
	screen.getByRole("menuitem", { name, hidden: true });

describe("AppMenuBar — navigation clavier", () => {
	it("rend une barre de menus dont les titres sont accessibles", () => {
		render(<AppMenuBar />);
		expect(
			screen.getByRole("menubar", { name: "Menu principal" }),
		).toBeInTheDocument();
		expect(title("Fichier")).toBeInTheDocument();
	});

	it("un seul titre est tabbable (roving tabindex)", () => {
		render(<AppMenuBar />);
		expect(title("Fichier")).toHaveAttribute("tabindex", "0");
		expect(title("Édition")).toHaveAttribute("tabindex", "-1");
	});

	it("les flèches déplacent le focus entre titres, avec bouclage", () => {
		render(<AppMenuBar />);
		title("Fichier").focus();

		fireEvent.keyDown(title("Fichier"), { key: "ArrowRight" });
		expect(title("Projet")).toHaveFocus();

		fireEvent.keyDown(title("Projet"), { key: "ArrowLeft" });
		expect(title("Fichier")).toHaveFocus();

		fireEvent.keyDown(title("Fichier"), { key: "ArrowLeft" });
		expect(title("Aide")).toHaveFocus();

		fireEvent.keyDown(title("Aide"), { key: "Home" });
		expect(title("Fichier")).toHaveFocus();
	});

	it("Entrée ouvre le menu, Échap le ferme et rend le focus au titre", async () => {
		render(<AppMenuBar />);
		const fichier = title("Fichier");
		fichier.focus();

		fireEvent.keyDown(fichier, { key: "Enter" });
		const menu = await screen.findByRole("menu", { name: "Fichier" });
		expect(fichier).toHaveAttribute("aria-expanded", "true");

		fireEvent.keyDown(menu, { key: "Escape" });
		expect(
			screen.queryByRole("menu", { name: "Fichier" }),
		).not.toBeInTheDocument();
		expect(fichier).toHaveFocus();
	});

	it("ArrowDown ouvre aussi le menu", async () => {
		render(<AppMenuBar />);
		title("Aide").focus();

		fireEvent.keyDown(title("Aide"), { key: "ArrowDown" });
		expect(await screen.findByRole("menu", { name: "Aide" })).toBeInTheDocument();
	});
});
