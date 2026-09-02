"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { JsPdfExporter } from "@/ui/lib/pdf/jspdf.pdf-exporter";
import { PdfCoverPage, PdfExportSection } from "@/ui/lib/pdf/pdf-exporter";
import { useT } from "@/ui/i18n/useT";
import { useCallback, useRef, useState } from "react";
import { OffscreenProgram } from "../pdf/OffscreenProgramRenderer";

export type PdfExportProgramConfig =
	{ type: "grafcet"; program: Grafcet } | { type: "ladder"; program: Ladder };

export type PdfExportState =
	| { status: "idle" }
	| { status: "rendering"; current: number; total: number; label: string }
	| { status: "capturing"; current: number; total: number; label: string }
	| { status: "assembling" }
	| { status: "error"; message: string };

export interface UsePdfExportResult {
	exportState: PdfExportState;
	offscreenPrograms: OffscreenProgram[];
	onProgramReady: (programId: string, element: HTMLElement) => void;
	startExport: (
		programs: PdfExportProgramConfig[],
		filename: string,
		cover?: PdfCoverPage,
	) => Promise<void>;
	reset: () => void;
}

/** Facteur de sur-échantillonnage de la capture : l'image finale est rasterisée à N× la
 * taille CSS puis réduite dans le PDF, ce qui la garde nette à l'impression. */
const CAPTURE_SCALE = 3;

/** Rend la main au thread de rendu le temps de deux frames : la première laisse React
 * committer, la seconde garantit qu'un paint a eu lieu (barre de progression, démontage). */
const nextFrame = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);

/** Éléments d'habillage de l'éditeur React Flow à exclure de la capture PDF (grille de fond,
 * panneaux, filigrane, contrôles, minimap). */
const EXPORT_EXCLUDED_CLASSES = [
	"react-flow__background",
	"react-flow__attribution",
	"react-flow__panel",
	"react-flow__controls",
	"react-flow__minimap",
	"react-flow__handle",
];

export const excludeEditorChrome = (node: Node): boolean => {
	const classList = (node as Element).classList;
	if (!classList) return true;
	return !EXPORT_EXCLUDED_CLASSES.some((c) => classList.contains(c));
};

export function usePdfExport(): UsePdfExportResult {
	const t = useT("projects.export");

	const sectionTitle = useCallback(
		(config: PdfExportProgramConfig): string =>
			t(
				config.type === "grafcet"
					? "sectionTitleGrafcet"
					: "sectionTitleLadder",
				{ name: config.program.name },
			),
		[t],
	);

	const [exportState, setExportState] = useState<PdfExportState>({
		status: "idle",
	});
	const [offscreenPrograms, setOffscreenPrograms] = useState<
		OffscreenProgram[]
	>([]);

	const resolversRef = useRef<Map<string, (el: HTMLElement) => void>>(
		new Map(),
	);

	const reset = useCallback(() => {
		setExportState({ status: "idle" });
		setOffscreenPrograms([]);
		resolversRef.current.clear();
	}, []);

	const onProgramReady = useCallback(
		(programId: string, element: HTMLElement) => {
			const resolve = resolversRef.current.get(programId);
			if (resolve) {
				resolve(element);
				resolversRef.current.delete(programId);
			}
		},
		[],
	);

	const startExport = useCallback(
		async (
			programs: PdfExportProgramConfig[],
			filename: string,
			cover?: PdfCoverPage,
		) => {
			if (programs.length === 0) return;

			const total = programs.length;
			setExportState({
				status: "rendering",
				current: 0,
				total,
				label: t("preparing"),
			});

			// Un seul programme monté hors-écran à la fois : monter les N ensemble ferait tourner
			// N éditeurs React Flow en parallèle et rasteriser en rafale, ce qui gèle l'UI.
			const sections: PdfExportSection[] = [];
			for (let i = 0; i < programs.length; i++) {
				const config = programs[i];
				setExportState({
					status: "rendering",
					current: i + 1,
					total,
					label: config.program.name,
				});

				const element = await new Promise<HTMLElement>((resolve) => {
					resolversRef.current.set(config.program.id, resolve);
					setOffscreenPrograms([config as OffscreenProgram]);
				});

				setExportState({
					status: "capturing",
					current: i + 1,
					total,
					label: config.program.name,
				});
				await nextFrame();
				const domToImage = (await import("dom-to-image")).default;
				try {
					const cssWidth = element.offsetWidth;
					const cssHeight = element.offsetHeight;
					const dataUrl = await domToImage.toPng(element, {
						width: cssWidth * CAPTURE_SCALE,
						height: cssHeight * CAPTURE_SCALE,
						bgcolor: "white",
						filter: excludeEditorChrome,
						style: {
							transform: `scale(${CAPTURE_SCALE})`,
							transformOrigin: "top left",
							width: `${cssWidth}px`,
							height: `${cssHeight}px`,
						},
					});
					sections.push({
						title: sectionTitle(config),
						imageDataUrl: dataUrl,
						imageWidth: cssWidth,
						imageHeight: cssHeight,
						orientation: config.type === "ladder" ? "landscape" : "portrait",
					});
				} catch {
					setExportState({
						status: "error",
						message: t("errorCapture", { name: config.program.name }),
					});
					setOffscreenPrograms([]);
					return;
				}

				setOffscreenPrograms([]);
				await nextFrame();
			}

			setExportState({ status: "assembling" });
			try {
				await new JsPdfExporter().export({ filename, cover, sections });
			} catch {
				setExportState({
					status: "error",
					message: t("errorAssembling"),
				});
				return;
			}

			reset();
		},
		[reset, t, sectionTitle],
	);

	return { exportState, offscreenPrograms, onProgramReady, startExport, reset };
}
