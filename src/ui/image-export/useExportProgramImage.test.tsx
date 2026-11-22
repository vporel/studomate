/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { toast } from "react-toastify";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProgramExportConfig } from "@/ui/pdf/program-pdf";
import trackImageExported from "./track-image-exported";
import useExportProgramImage from "./useExportProgramImage";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("./track-image-exported", () => ({
	__esModule: true,
	default: jest.fn(),
}));
const ladderContext = { programName: () => undefined };
jest.mock("@/ui/pdf/useLadderRenderContext", () => ({
	__esModule: true,
	default: () => ladderContext,
}));
const mockExport = jest.fn();
jest.mock("./program-image-export", () => ({
	...jest.requireActual("./program-image-export"),
	exportProgramImages: (...args: unknown[]) => mockExport(...args),
}));

const config = {
	type: "grafcet",
	program: { name: "Cycle" },
} as unknown as ProgramExportConfig;

function setup(
	format: "png" | "svg" = "png",
	getConfig: () => ProgramExportConfig = () => config,
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { name: "Projet" } }),
	);
	return renderHook(() => useExportProgramImage(getConfig, format), {
		wrapper: i18nWrapper(),
	});
}

describe("useExportProgramImage", () => {
	beforeEach(() => jest.clearAllMocks());

	it("exports the program named after the project and the program", async () => {
		mockExport.mockResolvedValue({ files: 1 });
		const { result } = setup("svg");

		act(() => result.current());

		await waitFor(() => expect(trackImageExported).toHaveBeenCalled());
		expect(mockExport).toHaveBeenCalledWith(
			[{ config, baseName: "Projet - Cycle" }],
			"svg",
			"Projet - Cycle",
			{ ladderContext },
		);
		expect(trackImageExported).toHaveBeenCalledWith({
			format: "svg",
			programType: "grafcet",
		});
	});

	it("reports a failure with a toast", async () => {
		mockExport.mockRejectedValue(new Error("boom"));
		const { result } = setup();

		act(() => result.current());

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"La génération des images a échoué.",
			),
		);
		expect(trackImageExported).not.toHaveBeenCalled();
	});

	it("reads the program when the export starts", async () => {
		mockExport.mockResolvedValue({ files: 1 });
		let current = config;
		const { result } = setup("png", () => current);
		const renamed = {
			type: "grafcet",
			program: { name: "Cycle 2" },
		} as unknown as ProgramExportConfig;
		current = renamed;

		act(() => result.current());

		await waitFor(() => expect(mockExport).toHaveBeenCalled());
		expect(mockExport.mock.calls[0][0]).toEqual([
			{ config: renamed, baseName: "Projet - Cycle 2" },
		]);
	});

	it("ignores new calls while an export is running, then accepts them again", async () => {
		let finish: () => void = () => {};
		mockExport.mockImplementationOnce(
			() => new Promise<void>((resolve) => (finish = resolve)),
		);
		const { result } = setup();

		act(() => result.current());
		await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
		act(() => result.current());
		await act(async () => finish());
		await waitFor(() => expect(trackImageExported).toHaveBeenCalledTimes(1));
		expect(mockExport).toHaveBeenCalledTimes(1);

		mockExport.mockResolvedValue({ files: 1 });
		act(() => result.current());
		await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(2));
	});

	it("accepts a new export after a failure", async () => {
		mockExport.mockRejectedValueOnce(new Error("boom"));
		const { result } = setup();

		act(() => result.current());
		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		mockExport.mockResolvedValue({ files: 1 });
		act(() => result.current());

		await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(2));
	});
});
