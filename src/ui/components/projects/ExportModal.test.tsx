/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { exportProject } from "@/ui/utils/project/project-export-utils";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ExportModal from "./ExportModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/utils/project/project-export-utils");

const startExport = jest.fn();
const reset = jest.fn();
jest.mock("../pdf/usePdfExport", () => ({
	usePdfExport: () => ({
		exportState: { status: "idle" },
		startExport,
		reset,
	}),
}));

function setup({
	setExportModalVisible = jest.fn(),
	project = new Project("p1", "Mon projet", ""),
	activeScope = "",
	activeScopeType = "project" as "project" | "grafcet" | "ladder" | "hmi",
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { exportModalVisible: true },
			setExportModalVisible,
			project,
			activeScope,
			activeScopeType,
		}),
	);
	renderWithI18n(<ExportModal />);
	return { setExportModalVisible, project };
}

const mainId = (project: Project) => Object.values(project.ladders)[0].id;

describe("ExportModal", () => {
	afterEach(() => jest.clearAllMocks());

	it("propose les deux formats, PDF sélectionné par défaut", () => {
		setup();
		expect(screen.getByRole("radio", { name: "PDF" })).toBeChecked();
		expect(
			screen.getByRole("radio", { name: /JSON/ }),
		).not.toBeChecked();
	});

	it("exporte le projet en JSON puis ferme la modale", () => {
		const { setExportModalVisible, project } = setup();

		fireEvent.click(screen.getByRole("radio", { name: /JSON/ }));
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		expect(exportProject).toHaveBeenCalledWith(project, "Mon projet");
		expect(setExportModalVisible).toHaveBeenCalledWith(false);
		expect(startExport).not.toHaveBeenCalled();
	});

	it("lance l'export PDF complet avec une page de garde par défaut", () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
		expect(exportProject).not.toHaveBeenCalled();
		const [programs, , cover] = startExport.mock.calls[0];
		expect(programs.length).toBeGreaterThan(0);
		expect(cover).toMatchObject({ projectName: "Mon projet" });
	});

	it("omet la page de garde quand la case est décochée", () => {
		setup();
		fireEvent.click(
			screen.getByRole("checkbox", { name: /page de garde/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
		expect(startExport.mock.calls[0][2]).toBeUndefined();
	});

	it("désactive « page active » sans programme actif", () => {
		setup();
		expect(
			screen.getByRole("radio", { name: /Page active/ }),
		).toBeDisabled();
	});

	it("exporte uniquement la page active, sans page de garde", () => {
		const project = new Project("p1", "Mon projet", "");
		setup({ project, activeScope: mainId(project), activeScopeType: "ladder" });

		fireEvent.click(screen.getByRole("radio", { name: /Page active/ }));
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		const [programs, , cover] = startExport.mock.calls[0];
		expect(programs).toHaveLength(1);
		expect(programs[0].program.id).toBe(mainId(project));
		expect(cover).toBeUndefined();
	});
});
