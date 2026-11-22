/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { ProgramExportConfig } from "@/ui/pdf/program-pdf";
import { useImageExport } from "./useImageExport";
import trackImageExported from "./track-image-exported";

const mockExport = jest.fn();
jest.mock("./program-image-export", () => ({
	exportProgramImages: (...args: unknown[]) => mockExport(...args),
}));
jest.mock("./track-image-exported", () => ({
	__esModule: true,
	default: jest.fn(),
}));

const requests = [
	{
		config: {
			type: "grafcet",
			program: { name: "G" },
		} as unknown as ProgramExportConfig,
		baseName: "G",
	},
];

describe("useImageExport", () => {
	beforeEach(() => jest.clearAllMocks());

	it("starts idle", () => {
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});

		expect(result.current.exportState).toEqual({ status: "idle" });
	});

	it("exports, tracks the result and goes back to idle", async () => {
		mockExport.mockResolvedValue({ files: 2 });
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});

		await act(() => result.current.startExport(requests, "png", "archive"));

		expect(mockExport).toHaveBeenCalledWith(
			requests,
			"png",
			"archive",
			expect.objectContaining({ onProgress: expect.any(Function) }),
		);
		expect(trackImageExported).toHaveBeenCalledWith({
			format: "png",
			programType: "grafcet",
		});
		expect(result.current.exportState).toEqual({ status: "idle" });
	});

	it("tracks one event per exported program with its own type", async () => {
		mockExport.mockResolvedValue({ files: 2 });
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});
		const mixed = [
			...requests,
			{
				config: {
					type: "ladder",
					program: { name: "L" },
				} as unknown as ProgramExportConfig,
				baseName: "L",
			},
		];

		await act(() => result.current.startExport(mixed, "svg", "archive"));

		expect(trackImageExported).toHaveBeenCalledTimes(2);
		expect(trackImageExported).toHaveBeenNthCalledWith(1, {
			format: "svg",
			programType: "grafcet",
		});
		expect(trackImageExported).toHaveBeenNthCalledWith(2, {
			format: "svg",
			programType: "ladder",
		});
	});

	it("exposes the progress reported by the export", async () => {
		let release: () => void = () => {};
		mockExport.mockImplementation(
			async (_r: unknown, _f: unknown, _a: unknown, options: any) => {
				await options.onProgress({ current: 1, total: 2, label: "G" });
				await new Promise<void>((resolve) => (release = resolve));
				return { files: 1 };
			},
		);
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});

		let pending: Promise<void> = Promise.resolve();
		await act(async () => {
			pending = result.current.startExport(requests, "svg", "a");
			await new Promise((resolve) => setTimeout(resolve, 5));
		});
		expect(result.current.exportState).toEqual({
			status: "rendering",
			current: 1,
			total: 2,
			label: "G",
		});

		await act(async () => {
			release();
			await pending;
		});
		expect(result.current.exportState).toEqual({ status: "idle" });
	});

	it("reports a failure without tracking anything", async () => {
		mockExport.mockRejectedValue(new Error("boom"));
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});

		await act(() => result.current.startExport(requests, "png", "a"));

		expect(result.current.exportState).toEqual({
			status: "error",
			message: "La génération des images a échoué.",
		});
		expect(trackImageExported).not.toHaveBeenCalled();
	});

	it("does nothing without a program", async () => {
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});

		await act(() => result.current.startExport([], "png", "a"));

		expect(mockExport).not.toHaveBeenCalled();
	});

	it("goes back to idle on reset", async () => {
		mockExport.mockRejectedValue(new Error("boom"));
		const { result } = renderHook(() => useImageExport(), {
			wrapper: i18nWrapper(),
		});
		await act(() => result.current.startExport(requests, "png", "a"));

		act(() => result.current.reset());

		expect(result.current.exportState).toEqual({ status: "idle" });
	});
});
