/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import ExportProgramPdfTool from "./ExportProgramPdfTool";

jest.mock("@/ui/components/projects/ProjectContext");

const exportProgram = jest.fn();
const exportHook = jest.fn((config: unknown) => {
	void config;
	return exportProgram;
});
jest.mock("@/ui/pdf/useExportProgramPdf", () => ({
	__esModule: true,
	default: (config: unknown) => exportHook(config),
}));

const config = {
	type: "grafcet",
	program: { name: "Cycle" },
} as unknown as PdfExportProgramConfig;

function setup(pdfExport: boolean) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ capabilities: { pdfExport } }),
	);
	return renderWithI18n(<ExportProgramPdfTool config={config} />);
}

describe("ExportProgramPdfTool", () => {
	beforeEach(() => jest.clearAllMocks());

	it("exports the program when clicked", () => {
		setup(true);

		fireEvent.click(
			screen.getByRole("button", { name: "Exporter ce programme en PDF" }),
		);

		expect(exportHook).toHaveBeenCalledWith(config);
		expect(exportProgram).toHaveBeenCalledTimes(1);
	});

	it("renders nothing when PDF export is unavailable", () => {
		const { container } = setup(false);

		expect(container).toBeEmptyDOMElement();
	});
});
