/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
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
		const [programs, , options] = startExport.mock.calls[0];
		expect(programs.length).toBeGreaterThan(0);
		expect(options.cover).toMatchObject({ projectName: "Mon projet" });
	});

	it("inclut les tables de variables (une par groupe) par défaut", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(
			new Variable("v1", "I0", "logic-input", "BOOL"),
			new Variable("v2", "M0", "memory", "BOOL"),
		);
		setup({ project });

		expect(
			screen.getByRole("checkbox", { name: /tables de variables/i }),
		).toBeChecked();
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		const { variableSections } = startExport.mock.calls[0][2];
		expect(
			variableSections.map((s: { title: string }) => s.title),
		).toEqual(["Variables d'entrée", "Variables de mémoire"]);
	});

	it("omet les tables de variables quand la case est décochée", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(new Variable("v1", "I0", "logic-input", "BOOL"));
		setup({ project });

		fireEvent.click(
			screen.getByRole("checkbox", { name: /tables de variables/i }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		expect(startExport.mock.calls[0][2].variableSections).toEqual([]);
	});

	it("omet la page de garde quand la case est décochée", () => {
		setup();
		fireEvent.click(
			screen.getByRole("checkbox", { name: "Page de garde" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
		expect(startExport.mock.calls[0][2].cover).toBeUndefined();
	});

	it("exporte la page de variables active seule (une section, sans page de garde)", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(new Variable("v1", "M0", "memory", "BOOL"));
		setup({
			project,
			activeScope: "memory-variables",
			activeScopeType: "project",
		});

		fireEvent.click(screen.getByRole("radio", { name: /Page active/ }));
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		const [programs, , options] = startExport.mock.calls[0];
		expect(programs).toEqual([]);
		expect(options.cover).toBeUndefined();
		expect(options.variableSections).toHaveLength(1);
		expect(
			options.variableSections[0].table.rows.map((r: string[]) => r[0]),
		).toEqual(["M0"]);
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

		const [programs, , options] = startExport.mock.calls[0];
		expect(programs).toHaveLength(1);
		expect(programs[0].program.id).toBe(mainId(project));
		expect(options.cover).toBeUndefined();
	});
});
