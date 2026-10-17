/**
 * @jest-environment jsdom
 */
import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import Scene3dConfigurationPage, {
	SCENE3D_CONFIGURATION_PAGE_ID,
} from "./Scene3dConfigurationPage";

jest.mock("../projects/ProjectContext");
jest.mock("@/3d-scenes/scene.registry", () => {
	const actual = jest.requireActual("@/3d-scenes/scene.registry");
	const v1 = actual.getSceneDescriptor("elevator", 1);
	const v2 = {
		...v1,
		version: 2,
		points: v1.points.filter((p: { id: string }) => p.id !== "down"),
	};
	return {
		...actual,
		listSceneVersions: (id: string) => (id === "elevator" ? [1, 2] : [1]),
		getSceneDescriptor: (id: string, version: number) =>
			id === "elevator" && version === 2
				? v2
				: actual.getSceneDescriptor(id, version),
	};
});

function setup(scene: Scene3d | null, mode = ProjectMode.DESIGN) {
	const setScene3d = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			activePageId: SCENE3D_CONFIGURATION_PAGE_ID,
			mode,
			project: { scene3d: scene, variables: [] },
			setScene3d,
			createMissingScene3dVariables: jest.fn(),
			scene3dLinkManager: { open: jest.fn() },
		}),
	);
	renderWithI18n(<Scene3dConfigurationPage />);
	return { setScene3d };
}

describe("Scene3dConfigurationPage: version", () => {
	afterEach(() => jest.clearAllMocks());

	it("n'affiche pas de sélecteur de version sans scène", () => {
		setup(null);
		expect(
			screen.queryByRole("combobox", { name: "Version" }),
		).not.toBeInTheDocument();
	});

	it("affiche la version de la scène et propose toutes ses versions", () => {
		setup({ sceneId: "elevator", sceneVersion: 1, bindings: {} });
		const select = screen.getByRole("combobox", { name: "Version" });
		expect(select).toHaveTextContent("v1");

		fireEvent.mouseDown(select);
		expect(screen.getByRole("option", { name: "v1" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "v2" })).toBeInTheDocument();
	});

	it("changer de version garde les liaisons des points qui existent encore", () => {
		const { setScene3d } = setup({
			sceneId: "elevator",
			sceneVersion: 1,
			bindings: { up: "v-up", down: "v-down" },
		});

		fireEvent.mouseDown(screen.getByRole("combobox", { name: "Version" }));
		fireEvent.click(screen.getByRole("option", { name: "v2" }));

		expect(setScene3d).toHaveBeenCalledWith({
			sceneId: "elevator",
			sceneVersion: 2,
			bindings: { up: "v-up" },
		});
	});

	it("verrouille le sélecteur de version en simulation", () => {
		setup(
			{ sceneId: "elevator", sceneVersion: 1, bindings: {} },
			ProjectMode.SIMULATION,
		);
		expect(screen.getByRole("combobox", { name: "Version" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});

	it("choisir une autre scène repart de sa dernière version", () => {
		const { setScene3d } = setup({
			sceneId: "carton-sorting",
			sceneVersion: 1,
			bindings: {},
		});
		fireEvent.click(screen.getByTestId("scene-picker"));
		fireEvent.click(screen.getByRole("button", { name: /Ascenseur/ }));
		expect(setScene3d).toHaveBeenCalledWith({
			sceneId: "elevator",
			sceneVersion: 1,
			bindings: {},
		});
	});
});
