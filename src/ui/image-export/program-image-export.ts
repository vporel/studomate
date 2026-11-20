import { downloadFile } from "@/ui/lib/download";
import { LadderRenderContext } from "@/ui/pdf/drawing/ladder-render-context";
import { ProgramExportConfig } from "@/ui/pdf/program-pdf";
import buildProgramImageScenes from "./program-image-scenes";
import { sceneToPngBytes, sceneToSvgString } from "./scene-image";

export type ImageFormat = "png" | "svg";

export type ProgramImageRequest = {
	config: ProgramExportConfig;
	/** File name without extension nor page suffix. */
	baseName: string;
};

export type ImageFile = { name: string; data: Uint8Array; mimeType: string };

export type ImageExportProgress = {
	current: number;
	total: number;
	label: string;
};

const MIME_TYPES: Record<ImageFormat, string> = {
	png: "image/png",
	svg: "image/svg+xml",
};

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function toSafeFileName(name: string): string {
	return name.replace(ILLEGAL_FILENAME_CHARS, "_").trim() || "export";
}

/**
 * Requests for the programs to export. A single program is named after `filename`; several are
 * named "<project> - <program>", made unique when two programs share a name.
 */
export function buildImageRequests(
	programs: ProgramExportConfig[],
	{ projectName, filename }: { projectName: string; filename: string },
): ProgramImageRequest[] {
	if (programs.length === 1)
		return [{ config: programs[0], baseName: toSafeFileName(filename) }];
	const used = new Map<string, number>();
	return programs.map((config) => {
		const base = toSafeFileName(`${projectName} - ${config.program.name}`);
		const count = (used.get(base) ?? 0) + 1;
		used.set(base, count);
		return {
			config,
			baseName: count === 1 ? base : `${base} (${count})`,
		};
	});
}

/** File names of the `count` images of a program: no suffix for one, `_1`, `_2`… otherwise. */
export function imageFileNames(
	baseName: string,
	count: number,
	format: ImageFormat,
): string[] {
	if (count === 1) return [`${baseName}.${format}`];
	return Array.from(
		{ length: count },
		(_, i) => `${baseName}_${i + 1}.${format}`,
	);
}

/** Renders every program into image files. Rejects if a rendering fails. */
export async function renderProgramImages(
	requests: ProgramImageRequest[],
	format: ImageFormat,
	{
		ladderContext,
		onProgress,
	}: {
		ladderContext?: LadderRenderContext;
		onProgress?: (progress: ImageExportProgress) => void | Promise<void>;
	} = {},
): Promise<ImageFile[]> {
	const files: ImageFile[] = [];
	for (let i = 0; i < requests.length; i++) {
		const { config, baseName } = requests[i];
		await onProgress?.({
			current: i + 1,
			total: requests.length,
			label: config.program.name,
		});
		const scenes = buildProgramImageScenes(config, ladderContext);
		const names = imageFileNames(baseName, scenes.length, format);
		for (let j = 0; j < scenes.length; j++) {
			const data =
				format === "png"
					? await sceneToPngBytes(scenes[j])
					: new TextEncoder().encode(sceneToSvgString(scenes[j]));
			files.push({ name: names[j], data, mimeType: MIME_TYPES[format] });
		}
	}
	return files;
}

/** Zips the files into a single archive named `archiveName`. */
export async function zipImageFiles(
	files: ImageFile[],
	archiveName: string,
): Promise<ImageFile> {
	const { zipSync } = await import("fflate");
	const entries: Record<string, Uint8Array> = {};
	for (const file of files) entries[file.name] = file.data;
	return {
		name: `${archiveName}.zip`,
		data: zipSync(entries),
		mimeType: "application/zip",
	};
}

/**
 * Renders the programs and downloads the result: the image itself when there is only one,
 * otherwise a zip named `archiveName`.
 */
export async function exportProgramImages(
	requests: ProgramImageRequest[],
	format: ImageFormat,
	archiveName: string,
	options: Parameters<typeof renderProgramImages>[2] = {},
): Promise<{ files: number }> {
	const files = await renderProgramImages(requests, format, options);
	const download =
		files.length === 1
			? files[0]
			: await zipImageFiles(files, toSafeFileName(archiveName));
	downloadFile(download.data as BlobPart, download.name, download.mimeType);
	return { files: files.length };
}
