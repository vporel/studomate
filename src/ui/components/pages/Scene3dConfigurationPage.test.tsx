/**
 * @jest-environment jsdom
 */
import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import Scene3dConfigurationPage from "./Scene3dConfigurationPage";
import { SCENE3D_CONFIGURATION_PAGE_ID } from "@/ui/stores/project/pages-data";

jest.mock("../projects/ProjectContext");

const VARIABLES = [
	VariableBuilder.buildLogicOutput("v-out", "moteur"),
	VariableBuilder.buildLogicInput("v-in", "capteur"),
	VariableBuilder.buildAnalogInput("v-pos", "hauteur"),
	VariableBuilder.buildMemoryInt("v-mem", "etage"),
];

function setup({
	scene = null,
	mode = ProjectMode.DESIGN,
}: { scene?: Scene3d | null; mode?: ProjectMode } = {}) {
	const setScene3d = jest.fn();
	const createMissingScene3dVariables = jest.fn();
	const open = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			activePageId: SCENE3D_CONFIGURATION_PAGE_ID,
			mode,
			project: { scene3d: scene, variables: VARIABLES },
			setScene3d,
			createMissingScene3dVariables,
			scene3dLinkManager: { open },
		}),
	);
	renderWithI18n(<Scene3dConfigurationPage />);
	return { setScene3d, createMissingScene3dVariables, open };
}

const pointSelect = (pointId: string) =>
	within(screen.getByTestId(`scene-point-${pointId}`)).getByRole("combobox");

describe("Scene3dConfigurationPage", () => {
	afterEach(() => jest.clearAllMocks());

	it("sans scène, affiche 'Aucune' et pas de tableau", () => {
		setup();

		expect(screen.getByTestId("scene-picker")).toHaveValue("Aucune");
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("choisir une scène la pose avec des liaisons vides", () => {
		const { setScene3d } = setup();

		fireEvent.click(screen.getByTestId("scene-picker"));
		fireEvent.click(screen.getByRole("button", { name: /Ascenseur/ }));

		expect(setScene3d).toHaveBeenCalledWith({
			sceneId: "elevator",
			sceneVersion: 1,
			bindings: {},
		});
	});

	it("choisir 'Aucune' retire la scène", () => {
		const { setScene3d } = setup({
			scene: { sceneId: "elevator", sceneVersion: 1, bindings: {} },
		});

		fireEvent.click(screen.getByTestId("scene-picker"));
		fireEvent.click(screen.getByRole("button", { name: /Aucune/ }));

		expect(setScene3d).toHaveBeenCalledWith(null);
	});

	it("n'offre pour un point que les variables de la bonne direction et du bon type", () => {
		setup({ scene: { sceneId: "elevator", sceneVersion: 1, bindings: {} } });

		fireEvent.mouseDown(pointSelect("up"));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent),
		).toEqual(["-", "moteur"]);
	});

	it("lier un point ajoute la variable aux liaisons", () => {
		const { setScene3d } = setup({
			scene: {
				sceneId: "elevator",
				sceneVersion: 1,
				bindings: { down: "v-out" },
			},
		});

		fireEvent.mouseDown(pointSelect("floor0"));
		fireEvent.click(screen.getByRole("option", { name: "capteur" }));

		expect(setScene3d).toHaveBeenCalledWith({
			sceneId: "elevator",
			sceneVersion: 1,
			bindings: { down: "v-out", floor0: "v-in" },
		});
	});

	it("choisir '-' délie le point", () => {
		const { setScene3d } = setup({
			scene: {
				sceneId: "elevator",
				sceneVersion: 1,
				bindings: { floor0: "v-in" },
			},
		});

		fireEvent.mouseDown(pointSelect("floor0"));
		fireEvent.click(screen.getByRole("option", { name: "-" }));

		expect(setScene3d).toHaveBeenCalledWith({
			sceneId: "elevator",
			sceneVersion: 1,
			bindings: {},
		});
	});

	it("le bouton crée les variables manquantes", () => {
		const { createMissingScene3dVariables } = setup({
			scene: { sceneId: "elevator", sceneVersion: 1, bindings: {} },
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Créer les variables manquantes" }),
		);

		expect(createMissingScene3dVariables).toHaveBeenCalledTimes(1);
	});

	it("le bouton est désactivé quand tous les points sont liés", () => {
		setup({
			scene: {
				sceneId: "elevator",
				sceneVersion: 1,
				bindings: {
					up: "v-out",
					down: "v-out",
					door: "v-out",
					floor0: "v-in",
					floor1: "v-in",
					floor2: "v-in",
					doorOpen: "v-in",
					cabinPosition: "v-pos",
					cabinButton0: "v-in",
					cabinButton1: "v-in",
					cabinButton2: "v-in",
					landingButton0: "v-in",
					landingButton1: "v-in",
					landingButton2: "v-in",
					currentFloor: "v-mem",
				},
			},
		});

		expect(
			screen.getByRole("button", { name: "Créer les variables manquantes" }),
		).toBeDisabled();
	});

	it("tout est verrouillé hors du mode Conception", () => {
		setup({
			scene: { sceneId: "elevator", sceneVersion: 1, bindings: {} },
			mode: ProjectMode.SIMULATION,
		});

		expect(screen.getByTestId("scene-picker")).toBeDisabled();
		expect(pointSelect("up")).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByRole("button", { name: "Créer les variables manquantes" }),
		).toBeDisabled();
	});

	it("le bouton « Ouvrir la scène » ouvre l'onglet de la scène, même hors conception", () => {
		const { open } = setup({
			scene: { sceneId: "elevator", sceneVersion: 1, bindings: {} },
			mode: ProjectMode.SIMULATION,
		});

		fireEvent.click(screen.getByRole("button", { name: "Ouvrir la scène" }));

		expect(open).toHaveBeenCalledTimes(1);
	});

	it("sans scène, le bouton « Ouvrir la scène » est absent", () => {
		setup();

		expect(
			screen.queryByRole("button", { name: "Ouvrir la scène" }),
		).not.toBeInTheDocument();
	});

	it("signale une scène inconnue", () => {
		setup({ scene: { sceneId: "zzz", sceneVersion: 1, bindings: {} } });

		expect(screen.getByText(/« zzz » est inconnue/)).toBeInTheDocument();
	});

	it("rechoisir la scène courante ne touche pas aux liaisons", () => {
		const { setScene3d } = setup({
			scene: {
				sceneId: "elevator",
				sceneVersion: 1,
				bindings: { up: "v-out" },
			},
		});

		fireEvent.click(screen.getByTestId("scene-picker"));
		fireEvent.click(screen.getByRole("button", { name: /Ascenseur/ }));

		expect(setScene3d).not.toHaveBeenCalled();
	});

	it("la modale de choix montre une capture par scène", () => {
		setup();

		fireEvent.click(screen.getByTestId("scene-picker"));

		expect(
			screen.getByRole("img", { name: "Capture de la scène Ascenseur" }),
		).toHaveAttribute("src", "/images/scenes-3d/elevator.png");
	});
});
