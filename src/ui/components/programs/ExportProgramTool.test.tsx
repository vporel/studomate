/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import ExportProgramTool from "./ExportProgramTool";

jest.mock("@/ui/components/projects/ProjectContext");

const exportPdf = jest.fn();
const exportPng = jest.fn();
const exportSvg = jest.fn();
const pdfHook = jest.fn((getConfig: unknown) => {
	void getConfig;
	return exportPdf;
});
const imageHook = jest.fn((getConfig: unknown, format: string) => {
	void getConfig;
	return format === "png" ? exportPng : exportSvg;
});
jest.mock("@/ui/pdf/useExportProgramPdf", () => ({
	__esModule: true,
	default: (getConfig: unknown) => pdfHook(getConfig),
}));
jest.mock("@/ui/image-export/useExportProgramImage", () => ({
	__esModule: true,
	default: (getConfig: unknown, format: string) => imageHook(getConfig, format),
}));

const config = {
	type: "grafcet",
	program: { name: "Cycle" },
} as unknown as PdfExportProgramConfig;
const getConfig = () => config;

function setup(canExport: boolean) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ capabilities: { export: canExport } }),
	);
	return renderWithI18n(<ExportProgramTool getConfig={getConfig} />);
}

const openMenu = () =>
	fireEvent.click(
		screen.getByRole("button", { name: "Exporter ce programme" }),
	);

describe("ExportProgramTool", () => {
	beforeEach(() => jest.clearAllMocks());

	it("offers PDF, PNG and SVG in that order once opened", () => {
		setup(true);

		openMenu();

		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent),
		).toEqual(["Exporter en PDF", "Exporter en PNG", "Exporter en SVG"]);
	});

	it("does not export anything before a format is chosen", () => {
		setup(true);

		openMenu();

		expect(exportPdf).not.toHaveBeenCalled();
		expect(exportPng).not.toHaveBeenCalled();
		expect(exportSvg).not.toHaveBeenCalled();
	});

	it.each([
		["Exporter en PDF", () => exportPdf],
		["Exporter en PNG", () => exportPng],
		["Exporter en SVG", () => exportSvg],
	])("runs only the %s export", (label, expected) => {
		setup(true);
		openMenu();

		fireEvent.click(screen.getByRole("menuitem", { name: label }));

		for (const fn of [exportPdf, exportPng, exportSvg])
			expect(fn).toHaveBeenCalledTimes(fn === expected() ? 1 : 0);
	});

	it("hands the program to every export hook", () => {
		setup(true);

		expect(pdfHook).toHaveBeenCalledWith(getConfig);
		expect(imageHook).toHaveBeenCalledWith(getConfig, "png");
		expect(imageHook).toHaveBeenCalledWith(getConfig, "svg");
	});

	it("renders nothing when export is unavailable", () => {
		const { container } = setup(false);

		expect(container).toBeEmptyDOMElement();
	});
});
