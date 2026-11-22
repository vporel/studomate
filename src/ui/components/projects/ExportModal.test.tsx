/**
 * @jest-environment jsdom
 */
import { PDF_PAGE_NUMBER } from "@/ui/pdf/pdf-exporter";
import { Dialect } from "@/expression-language/dialect.enum";
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { exportProject } from "@/ui/components/projects/project-export";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ExportModal from "./ExportModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/components/projects/project-export");

const startExport = jest.fn();
const reset = jest.fn();
jest.mock("@/ui/pdf/usePdfExport", () => ({
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
		expect(screen.getByRole("radio", { name: /JSON/ })).not.toBeChecked();
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
		expect(options.pageFrame).toEqual({
			headerLeft: "Mon projet",
			footerLeft: undefined,
			footerRight: PDF_PAGE_NUMBER,
		});
		expect(options.coverPageFrame).toEqual({
			footerRight: PDF_PAGE_NUMBER,
		});
	});

	it("met l'auteur en pied de page à gauche dès la 2e page de l'export complet", () => {
		const project = new Project("p1", "Mon projet", "");
		project.author = "Alice";
		setup({ project });

		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		expect(startExport.mock.calls[0][2].pageFrame).toMatchObject({
			headerLeft: "Mon projet",
			footerLeft: "Auteur : Alice",
		});
	});

	it("inclut les tables de variables (une par groupe) par défaut", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(
			new Variable({
				id: "v1",
				mnemonic: "I0",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			new Variable({
				id: "v2",
				mnemonic: "M0",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);
		setup({ project });

		expect(
			screen.getByRole("checkbox", { name: /tables de variables/i }),
		).toBeChecked();
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		const { variableSections } = startExport.mock.calls[0][2];
		expect(variableSections.map((s: { title: string }) => s.title)).toEqual([
			"Variables d'entrée",
			"Variables de mémoire",
		]);
	});

	it("omet les tables de variables quand la case est décochée", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(
			new Variable({
				id: "v1",
				mnemonic: "I0",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);
		setup({ project });

		fireEvent.click(
			screen.getByRole("checkbox", { name: /tables de variables/i }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		expect(startExport.mock.calls[0][2].variableSections).toEqual([]);
	});

	it("omet la page de garde quand la case est décochée", () => {
		setup();
		fireEvent.click(screen.getByRole("checkbox", { name: "Page de garde" }));
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
		expect(startExport.mock.calls[0][2].cover).toBeUndefined();
	});

	it("applique le cadre complet dès la 1re page sans page de garde", () => {
		setup();
		fireEvent.click(screen.getByRole("checkbox", { name: "Page de garde" }));
		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

		const options = startExport.mock.calls[0][2];
		expect(options.coverPageFrame).toBeUndefined();
		expect(options.pageFrame.headerLeft).toBe("Mon projet");
	});

	it("exporte la page de variables active seule (une section, sans page de garde)", () => {
		const project = new Project("p1", "Mon projet", "");
		project.variables.push(
			new Variable({
				id: "v1",
				mnemonic: "M0",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);
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
		expect(options.pageFrame).toMatchObject({ headerLeft: "Mon projet" });
		expect(options.variableSections[0].title).not.toContain("Mon projet");
		expect(options.variableSections).toHaveLength(1);
		expect(
			options.variableSections[0].table.rows.map((r: string[]) => r[0]),
		).toEqual(["M0"]);
	});

	it("désactive « page active » sans programme actif", () => {
		setup();
		expect(screen.getByRole("radio", { name: /Page active/ })).toBeDisabled();
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
		expect(options.pageFrame).toMatchObject({
			headerLeft: "Mon projet",
			footerLeft: expect.stringMatching(/^Exporté le /),
			footerRight: PDF_PAGE_NUMBER,
		});
	});
});
