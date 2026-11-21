/**
 * @jest-environment jsdom
 */
import { unzipSync, strFromU8 } from "fflate";
import { Scene } from "@/ui/lib/drawing/draw-op";
import { ProgramExportConfig } from "@/ui/pdf/program-pdf";
import {
	buildImageRequests,
	exportProgramImages,
	imageFileNames,
	renderProgramImages,
	toSafeFileName,
	zipImageFiles,
} from "./program-image-export";

let mockScenes: Scene[] = [];
jest.mock("./program-image-scenes", () => ({
	__esModule: true,
	default: () => mockScenes,
}));
jest.mock("./scene-image", () => ({
	sceneToPngBytes: jest.fn(async () => new Uint8Array([9, 9])),
	sceneToSvgString: jest.fn(() => "<svg/>"),
}));
const mockDownload = jest.fn();
jest.mock("@/ui/lib/download", () => ({
	downloadFile: (...args: unknown[]) => mockDownload(...args),
}));

const scene = (): Scene => ({ ops: [], width: 10, height: 10 });
const program = (name: string, type = "grafcet") =>
	({ type, program: { name } }) as unknown as ProgramExportConfig;

describe("toSafeFileName", () => {
	it("replaces characters forbidden in file names", () => {
		expect(toSafeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
	});

	it("falls back to a default name when nothing is left", () => {
		expect(toSafeFileName("   ")).toBe("export");
	});
});

describe("imageFileNames", () => {
	it("has no suffix for a single image", () => {
		expect(imageFileNames("Cycle", 1, "png")).toEqual(["Cycle.png"]);
	});

	it("numbers several images from 1", () => {
		expect(imageFileNames("Cycle", 3, "svg")).toEqual([
			"Cycle_1.svg",
			"Cycle_2.svg",
			"Cycle_3.svg",
		]);
	});
});

describe("buildImageRequests", () => {
	it("names a single program after the chosen file name", () => {
		const requests = buildImageRequests([program("Cycle")], {
			projectName: "Projet",
			filename: "mon fichier",
		});

		expect(requests.map((r) => r.baseName)).toEqual(["mon fichier"]);
	});

	it("names several programs after the project and their own name", () => {
		const requests = buildImageRequests([program("A"), program("B")], {
			projectName: "Projet",
			filename: "archive",
		});

		expect(requests.map((r) => r.baseName)).toEqual([
			"Projet - A",
			"Projet - B",
		]);
	});

	it("makes the names unique when two programs share one", () => {
		const requests = buildImageRequests(
			[program("Main"), program("Main", "ladder"), program("Main")],
			{ projectName: "P", filename: "x" },
		);

		expect(requests.map((r) => r.baseName)).toEqual([
			"P - Main",
			"P - Main (2)",
			"P - Main (3)",
		]);
	});

	it("keeps names unique when a program is literally named like a generated suffix", () => {
		const requests = buildImageRequests(
			[program("Main"), program("Main"), program("Main (2)")],
			{ projectName: "P", filename: "x" },
		);

		const names = requests.map((r) => r.baseName);
		expect(new Set(names).size).toBe(names.length);
	});

	it("keeps names unique when two programs differ only by case", () => {
		const requests = buildImageRequests([program("main"), program("Main")], {
			projectName: "P",
			filename: "x",
		});

		const names = requests.map((r) => r.baseName.toLowerCase());
		expect(new Set(names).size).toBe(names.length);
	});

	it("gives three distinct, stable names to Main, Main and Main (2)", () => {
		const requests = buildImageRequests(
			[program("Main"), program("Main"), program("Main (2)")],
			{ projectName: "P", filename: "x" },
		);

		expect(requests.map((r) => r.baseName)).toEqual([
			"P - Main",
			"P - Main (2)",
			"P - Main (2) (2)",
		]);
	});

	it("sanitizes program names", () => {
		const [request] = buildImageRequests([program("a"), program("b/c")], {
			projectName: "P",
			filename: "x",
		}).slice(1);

		expect(request.baseName).toBe("P - b_c");
	});
});

describe("renderProgramImages", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockScenes = [scene()];
	});

	it("renders one PNG file per scene, numbered when there are several", async () => {
		mockScenes = [scene(), scene()];

		const files = await renderProgramImages(
			[{ config: program("L", "ladder"), baseName: "Ladder" }],
			"png",
		);

		expect(files.map((f) => f.name)).toEqual(["Ladder_1.png", "Ladder_2.png"]);
		expect(files[0].mimeType).toBe("image/png");
		expect(Array.from(files[0].data)).toEqual([9, 9]);
	});

	it("encodes SVG files as text", async () => {
		const [file] = await renderProgramImages(
			[{ config: program("G"), baseName: "G" }],
			"svg",
		);

		expect(file.name).toBe("G.svg");
		expect(file.mimeType).toBe("image/svg+xml");
		expect(strFromU8(file.data)).toBe("<svg/>");
	});

	it("reports the progress program by program", async () => {
		const onProgress = jest.fn();

		await renderProgramImages(
			[
				{ config: program("A"), baseName: "A" },
				{ config: program("B"), baseName: "B" },
			],
			"png",
			{ onProgress },
		);

		expect(onProgress.mock.calls.map(([p]) => p)).toEqual([
			{ current: 1, total: 2, label: "A" },
			{ current: 2, total: 2, label: "B" },
		]);
	});
});

describe("zipImageFiles", () => {
	it("packs the files under their names in an archive named after the export", async () => {
		const archive = await zipImageFiles(
			[
				{ name: "a.png", data: new Uint8Array([1, 2]), mimeType: "image/png" },
				{ name: "b.png", data: new Uint8Array([3]), mimeType: "image/png" },
			],
			"projet",
		);

		expect(archive.name).toBe("projet.zip");
		expect(archive.mimeType).toBe("application/zip");
		const entries = unzipSync(archive.data);
		expect(Object.keys(entries)).toEqual(["a.png", "b.png"]);
		expect(Array.from(entries["a.png"])).toEqual([1, 2]);
	});
});

describe("exportProgramImages", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockScenes = [scene()];
	});

	it("downloads the image itself when there is only one", async () => {
		const result = await exportProgramImages(
			[{ config: program("G"), baseName: "G" }],
			"png",
			"G",
		);

		expect(result).toEqual({ files: 1 });
		expect(mockDownload).toHaveBeenCalledTimes(1);
		expect(mockDownload).toHaveBeenCalledWith(
			expect.any(Uint8Array),
			"G.png",
			"image/png",
		);
	});

	it("downloads a zip when a program spans several images", async () => {
		mockScenes = [scene(), scene()];

		const result = await exportProgramImages(
			[{ config: program("L", "ladder"), baseName: "L" }],
			"png",
			"L",
		);

		expect(result).toEqual({ files: 2 });
		expect(mockDownload).toHaveBeenCalledTimes(1);
		const [data, name, mime] = mockDownload.mock.calls[0];
		expect([name, mime]).toEqual(["L.zip", "application/zip"]);
		expect(Object.keys(unzipSync(data))).toEqual(["L_1.png", "L_2.png"]);
	});

	it("downloads one zip for several programs, sanitizing the archive name", async () => {
		await exportProgramImages(
			[
				{ config: program("A"), baseName: "P - A" },
				{ config: program("B"), baseName: "P - B" },
			],
			"svg",
			"a/b",
		);

		expect(mockDownload).toHaveBeenCalledTimes(1);
		expect(mockDownload.mock.calls[0][1]).toBe("a_b.zip");
	});

	it("downloads nothing and rejects when a rendering fails", async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { sceneToPngBytes } = require("./scene-image");
		sceneToPngBytes.mockRejectedValueOnce(new Error("boom"));

		await expect(
			exportProgramImages(
				[{ config: program("G"), baseName: "G" }],
				"png",
				"G",
			),
		).rejects.toThrow("boom");
		expect(mockDownload).not.toHaveBeenCalled();
	});
});
