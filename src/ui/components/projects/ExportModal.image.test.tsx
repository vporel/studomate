/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ExportModal from "./ExportModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/components/projects/project-export");

const startPdfExport = jest.fn();
jest.mock("@/ui/pdf/usePdfExport", () => ({
	usePdfExport: () => ({
		exportState: { status: "idle" },
		startExport: startPdfExport,
		reset: jest.fn(),
	}),
}));

const startImageExport = jest.fn();
let imageState: unknown = { status: "idle" };
jest.mock("@/ui/image-export/useImageExport", () => ({
	useImageExport: () => ({
		exportState: imageState,
		startExport: startImageExport,
		reset: jest.fn(),
	}),
}));

function setup({
	project = new Project("p1", "Mon projet", ""),
	activeScope = "",
	activeScopeType = "project" as "project" | "grafcet" | "ladder" | "hmi",
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { exportModalVisible: true },
			setExportModalVisible: jest.fn(),
			project,
			activeScope,
			activeScopeType,
		}),
	);
	renderWithI18n(<ExportModal />);
	return { project };
}

const chooseImage = () =>
	fireEvent.click(screen.getByRole("radio", { name: "Export image" }));
const exportButton = () => screen.getByRole("button", { name: "Exporter" });

describe("ExportModal, export image", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		imageState = { status: "idle" };
	});

	it("proposes the image export between PDF and JSON", () => {
		setup();

		const labels = screen
			.getAllByRole("radio")
			.slice(0, 3)
			.map((radio) => radio.closest("label")?.textContent);

		expect(labels).toEqual(["PDF", "Export image", "Fichier projet (JSON)"]);
	});

	it("proposes PNG by default, then SVG", () => {
		setup();
		chooseImage();

		expect(screen.getByRole("radio", { name: "PNG" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "SVG" })).not.toBeChecked();
	});

	it("exports every program as PNG by default, without going through the PDF", () => {
		const { project } = setup();
		chooseImage();

		fireEvent.click(exportButton());

		expect(startPdfExport).not.toHaveBeenCalled();
		const [requests, format, archiveName] = startImageExport.mock.calls[0];
		expect(format).toBe("png");
		expect(archiveName).toBe("Mon projet");
		expect(requests.length).toBe(
			Object.keys(project.grafcets).length +
				Object.keys(project.ladders).length,
		);
	});

	it("exports in SVG when asked", () => {
		setup();
		chooseImage();
		fireEvent.click(screen.getByRole("radio", { name: "SVG" }));

		fireEvent.click(exportButton());

		expect(startImageExport.mock.calls[0][1]).toBe("svg");
	});

	it("only exports the checked programs", () => {
		const project = new Project("p1", "Mon projet", "");
		const grafcet = project.createGrafcet("Cycle");
		setup({ project });
		chooseImage();
		fireEvent.click(screen.getByRole("checkbox", { name: "Cycle" }));

		fireEvent.click(exportButton());

		const names = startImageExport.mock.calls[0][0].map(
			(r: { config: { program: { name: string } } }) => r.config.program.name,
		);
		expect(names).not.toContain(grafcet.name);
		expect(names).toEqual(
			Object.values(project.ladders).map((ladder) => ladder.name),
		);
	});

	it("disables the export when no program is checked", () => {
		const { project } = setup();
		chooseImage();
		for (const program of [
			...Object.values(project.grafcets),
			...Object.values(project.ladders),
		])
			fireEvent.click(screen.getByRole("checkbox", { name: program.name }));

		expect(exportButton()).toBeDisabled();
	});

	it("exports the active program alone under its own name", () => {
		const project = new Project("p1", "Mon projet", "");
		const ladder = Object.values(project.ladders)[0];
		setup({ project, activeScope: ladder.id, activeScopeType: "ladder" });
		chooseImage();

		fireEvent.click(
			screen.getByRole("radio", {
				name: `Programme actif uniquement (${ladder.name})`,
			}),
		);
		expect(screen.getByRole("textbox", { name: "Nom du fichier" })).toHaveValue(
			ladder.name,
		);
		fireEvent.click(exportButton());

		const [requests, , archiveName] = startImageExport.mock.calls[0];
		expect(requests).toHaveLength(1);
		expect(requests[0].config.program).toBe(ladder);
		expect(requests[0].baseName).toBe(ladder.name);
		expect(archiveName).toBe(ladder.name);
	});

	it("names the export after the project when switching to image after choosing the active PDF page", () => {
		const project = new Project("p1", "Mon projet", "");
		const ladder = Object.values(project.ladders)[0];
		setup({ project, activeScope: ladder.id, activeScopeType: "ladder" });
		fireEvent.click(screen.getByRole("radio", { name: /Page active/ }));
		chooseImage();

		expect(screen.getByRole("textbox", { name: "Nom du fichier" })).toHaveValue(
			"Mon projet",
		);
		fireEvent.click(exportButton());
		expect(startImageExport.mock.calls[0][2]).toBe("Mon projet");
	});

	it("names the export after the active page when switching back to the active PDF page", () => {
		const project = new Project("p1", "Mon projet", "");
		const ladder = Object.values(project.ladders)[0];
		setup({ project, activeScope: ladder.id, activeScopeType: "ladder" });
		fireEvent.click(screen.getByRole("radio", { name: /Page active/ }));
		chooseImage();
		fireEvent.click(screen.getByRole("radio", { name: "PDF" }));

		expect(screen.getByRole("textbox", { name: "Nom du fichier" })).toHaveValue(
			ladder.name,
		);
	});

	it("names the export after the project when switching to JSON", () => {
		const project = new Project("p1", "Mon projet", "");
		const ladder = Object.values(project.ladders)[0];
		setup({ project, activeScope: ladder.id, activeScopeType: "ladder" });
		chooseImage();
		fireEvent.click(
			screen.getByRole("radio", {
				name: `Programme actif uniquement (${ladder.name})`,
			}),
		);
		fireEvent.click(screen.getByRole("radio", { name: /JSON/ }));

		expect(screen.getByRole("textbox", { name: "Nom du fichier" })).toHaveValue(
			"Mon projet",
		);
	});

	it("explains that the active program is unavailable on a page that is not a program", () => {
		setup({ activeScope: "variables-input", activeScopeType: "project" });
		chooseImage();

		expect(
			screen.getByRole("radio", { name: "Programme actif uniquement" }),
		).toBeDisabled();
		expect(
			screen.getByText(/ne concerne que les grafcets et les ladders/),
		).toBeInTheDocument();
	});

	it("keeps the image tab and its hint visible when no page is open", () => {
		setup();
		chooseImage();

		expect(
			screen.getByRole("radio", { name: "Plusieurs programmes" }),
		).toBeChecked();
	});

	it("tells that several images are bundled in a ZIP archive", () => {
		setup();
		chooseImage();

		expect(screen.getByText(/archive ZIP/)).toBeInTheDocument();
	});

	it("shows the image export progress and locks the form while rendering", () => {
		imageState = { status: "rendering", current: 2, total: 3, label: "Cycle" };
		setup();
		chooseImage();

		expect(screen.getByText(/Rendu \(2\/3\)/)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Export en cours…" }),
		).toBeDisabled();
	});

	it("shows the image export error", () => {
		imageState = {
			status: "error",
			message: "La génération des images a échoué.",
		};
		setup();
		chooseImage();

		expect(
			screen.getByText("La génération des images a échoué."),
		).toBeInTheDocument();
	});
});
