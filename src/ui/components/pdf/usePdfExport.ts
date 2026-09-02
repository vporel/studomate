"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { JsPdfExporter } from "@/ui/lib/pdf/jspdf.pdf-exporter";
import { PdfCoverPage, PdfExportSection } from "@/ui/lib/pdf/pdf-exporter";
import { LadderRenderContext } from "@/ui/lib/program-export-drawing/ladder-render-context";
import renderProgramScenes from "@/ui/lib/program-export-drawing/program-scene";
import { useT } from "@/ui/i18n/useT";
import { useCallback, useState } from "react";

export type PdfExportProgramConfig =
	| { type: "grafcet"; program: Grafcet }
	| { type: "ladder"; program: Ladder };

export type PdfExportState =
	| { status: "idle" }
	| { status: "rendering"; current: number; total: number; label: string }
	| { status: "assembling" }
	| { status: "error"; message: string };

export interface UsePdfExportResult {
	exportState: PdfExportState;
	startExport: (
		programs: PdfExportProgramConfig[],
		filename: string,
		cover?: PdfCoverPage,
		ladderContext?: LadderRenderContext,
	) => Promise<void>;
	reset: () => void;
}

/** Rend la main au thread le temps d'un repaint, pour que la barre de progression s'affiche
 * entre deux programmes (le rendu d'une scène est synchrone et rapide). */
const yieldToPaint = () =>
	new Promise<void>((resolve) => setTimeout(resolve, 0));

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

	const reset = useCallback(() => {
		setExportState({ status: "idle" });
	}, []);

	const startExport = useCallback(
		async (
			programs: PdfExportProgramConfig[],
			filename: string,
			cover?: PdfCoverPage,
			ladderContext?: LadderRenderContext,
		) => {
			if (programs.length === 0) return;

			const total = programs.length;
			const sections: PdfExportSection[] = [];

			for (let i = 0; i < programs.length; i++) {
				const config = programs[i];
				setExportState({
					status: "rendering",
					current: i + 1,
					total,
					label: config.program.name,
				});
				await yieldToPaint();

				try {
					const pages = renderProgramScenes(config, ladderContext);
					if (config.type === "ladder") {
						sections.push({
							title: sectionTitle(config),
							orientation: "landscape",
							ladderSections: pages.map((p) => ({
								heading: p.heading ?? "",
								scene: p.scene,
							})),
						});
					} else {
						sections.push({
							title: sectionTitle(config),
							orientation: "portrait",
							scene: pages[0].scene,
						});
					}
				} catch {
					setExportState({
						status: "error",
						message: t("errorCapture", { name: config.program.name }),
					});
					return;
				}
			}

			setExportState({ status: "assembling" });
			try {
				await new JsPdfExporter().export({ filename, cover, sections });
			} catch {
				setExportState({ status: "error", message: t("errorAssembling") });
				return;
			}

			reset();
		},
		[reset, t, sectionTitle],
	);

	return { exportState, startExport, reset };
}
