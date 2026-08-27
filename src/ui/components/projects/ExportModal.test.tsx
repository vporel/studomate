/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { exportGrafcet } from "@/ui/utils/grafcet/grafcet-export-utils";
import { exportProject } from "@/ui/utils/project/project-export-utils";
import { useProjectContext, useProjectStore } from "./ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ExportModal from "./ExportModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/utils/grafcet/grafcet-export-utils");
jest.mock("@/ui/utils/project/project-export-utils");

function setup({
	activeScopeType = "project" as "project" | "grafcet" | "ladder",
	activeScope = "",
	setExportModalVisible = jest.fn(),
	getProgramOrThrow = jest.fn(),
	project = new Project("p1", "Mon projet", ""),
} = {}) {
	(useProjectContext as jest.Mock).mockReturnValue({
		getState: () => ({ project }),
	});
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { exportModalVisible: true },
			setExportModalVisible,
			activeScope,
			activeScopeType,
			grafcetsManager: { getProgramOrThrow },
		}),
	);

	render(<ExportModal />);
	return { setExportModalVisible, getProgramOrThrow, project };
}

describe("ExportModal", () => {
	afterEach(() => jest.clearAllMocks());

	it("désactive 'Exporter' tant qu'aucun choix n'est fait", () => {
		setup();
		expect(screen.getByText("Exporter", { selector: "button" })).toBeDisabled();
	});

	it("désactive l'option 'Exporter le grafcet actif' hors d'un scope grafcet", () => {
		setup({ activeScopeType: "project" });
		expect(screen.getByDisplayValue("grafcet")).toBeDisabled();
	});

	it("active l'option 'Exporter le grafcet actif' dans un scope grafcet", () => {
		setup({ activeScopeType: "grafcet", activeScope: "g1" });
		expect(screen.getByDisplayValue("grafcet")).not.toBeDisabled();
	});

	it("exporte le projet, puis ferme la modale", () => {
		const { setExportModalVisible, project } = setup();

		fireEvent.click(screen.getByDisplayValue("project"));
		fireEvent.click(screen.getByText("Exporter", { selector: "button" }));

		expect(exportProject).toHaveBeenCalledWith(project, "Mon projet");
		expect(setExportModalVisible).toHaveBeenCalledWith(false);
	});

	it("ajoute la date au nom de fichier quand la case est cochée", () => {
		const { project } = setup();
		const today = new Date().toISOString().slice(0, 10);

		fireEvent.click(screen.getByDisplayValue("project"));
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByText("Exporter", { selector: "button" }));

		expect(exportProject).toHaveBeenCalledWith(project, `Mon projet-${today}`);
	});

	it("exporte le grafcet actif quand ce choix est sélectionné", () => {
		const grafcet = { name: "Grafcet 1", format: {} };
		const { getProgramOrThrow } = setup({
			activeScopeType: "grafcet",
			activeScope: "g1",
			getProgramOrThrow: jest.fn(() => grafcet),
		});

		fireEvent.click(screen.getByDisplayValue("grafcet"));
		fireEvent.click(screen.getByText("Exporter", { selector: "button" }));

		expect(getProgramOrThrow).toHaveBeenCalledWith("g1");
		expect(exportGrafcet).toHaveBeenCalledWith(
			"g1",
			"Grafcet 1",
			grafcet.format,
		);
	});
});
