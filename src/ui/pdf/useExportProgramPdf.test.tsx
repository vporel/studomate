/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { toast } from "react-toastify";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import trackPdfExported from "./track-pdf-exported";
import useExportProgramPdf from "./useExportProgramPdf";
import type { PdfExportProgramConfig } from "./usePdfExport";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("./track-pdf-exported", () => ({
	__esModule: true,
	default: jest.fn(),
}));

const ladderContext = { programName: () => undefined };
jest.mock("./useLadderRenderContext", () => ({
	__esModule: true,
	default: () => ladderContext,
}));

const exportProgramPdf = jest.fn();
jest.mock("@/ui/pdf/program-pdf", () => ({
	exportProgramPdf: (...args: unknown[]) => exportProgramPdf(...args),
}));

function setup(config: PdfExportProgramConfig, projectName = "Projet") {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { name: projectName, author: "Alice" },
		}),
	);
	return renderHook(() => useExportProgramPdf(config), {
		wrapper: i18nWrapper(),
	});
}

const pageFrame = {
	headerLeft: "Projet",
	footerRight: "{page_number}/{pages_count}",
	footerLeft: expect.stringMatching(/^Auteur : Alice \u2014 Exporté le /),
};

const grafcetConfig = {
	type: "grafcet",
	program: { name: "Cycle" },
} as unknown as PdfExportProgramConfig;
const ladderConfig = {
	type: "ladder",
	program: { name: "Pompe" },
} as unknown as PdfExportProgramConfig;

describe("useExportProgramPdf", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		exportProgramPdf.mockResolvedValue(undefined);
	});

	it("downloads a grafcet named after the project and the program, without ladder context", async () => {
		const { result } = setup(grafcetConfig);

		act(() => result.current());

		await waitFor(() => expect(trackPdfExported).toHaveBeenCalled());
		expect(exportProgramPdf).toHaveBeenCalledWith({
			config: grafcetConfig,
			filename: "Projet - Cycle",
			sectionTitle: "GRAFCET - Cycle",
			pageFrame,
			ladderContext: undefined,
		});
		expect(trackPdfExported).toHaveBeenCalledWith({
			programs: 1,
			withVariablesTable: false,
		});
	});

	it("passes the ladder render context for a ladder", async () => {
		const { result } = setup(ladderConfig);

		act(() => result.current());

		await waitFor(() => expect(exportProgramPdf).toHaveBeenCalled());
		expect(exportProgramPdf).toHaveBeenCalledWith({
			config: ladderConfig,
			filename: "Projet - Pompe",
			sectionTitle: "Ladder - Pompe",
			pageFrame,
			ladderContext,
		});
	});

	it("reports a failure with a toast and does not track the export", async () => {
		exportProgramPdf.mockRejectedValue(new Error("boom"));
		const { result } = setup(grafcetConfig);

		act(() => result.current());

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		expect(trackPdfExported).not.toHaveBeenCalled();
	});
});
