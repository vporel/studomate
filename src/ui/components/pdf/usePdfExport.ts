"use client";

import { JsPdfExporter } from "@/ui/lib/pdf/jspdf.pdf-exporter";
import { PdfCoverPage, PdfExportSection } from "@/ui/lib/pdf/pdf-exporter";
import {
	buildProgramSection,
	ProgramExportConfig,
} from "@/ui/lib/pdf/program-pdf";
import { LadderRenderContext } from "@/ui/lib/program-export-drawing/ladder-render-context";
import trackEvent from "@/ui/lib/analytics";
import { useT } from "@/ui/i18n/useT";
import { useCallback, useState } from "react";

export type PdfExportProgramConfig = ProgramExportConfig;

export type PdfExportState =
	| { status: "idle" }
	| { status: "rendering"; current: number; total: number; label: string }
	| { status: "assembling" }
	| { status: "error"; message: string };

export interface PdfExportOptions {
	cover?: PdfCoverPage;
	ladderContext?: LadderRenderContext;
	/** Tables de variables : placées après la page de garde et avant les programmes. */
	variableSections?: PdfExportSection[];
}

export interface UsePdfExportResult {
	exportState: PdfExportState;
	startExport: (
		programs: PdfExportProgramConfig[],
		filename: string,
		options?: PdfExportOptions,
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
			options: PdfExportOptions = {},
		) => {
			const { cover, ladderContext, variableSections = [] } = options;
			if (programs.length === 0 && variableSections.length === 0) return;

			const total = programs.length;
			const programSections: PdfExportSection[] = [];

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
					programSections.push(
						buildProgramSection(
							config,
							sectionTitle(config),
							ladderContext,
						),
					);
				} catch {
					setExportState({
						status: "error",
						message: t("errorCapture", { name: config.program.name }),
					});
					return;
				}
			}

			// Ordre du document : page de garde (gérée par l'exporter), puis tables de variables,
			// puis programmes.
			const sections = [...variableSections, ...programSections];

			setExportState({ status: "assembling" });
			try {
				await new JsPdfExporter().export({ filename, cover, sections });
			} catch {
				setExportState({ status: "error", message: t("errorAssembling") });
				return;
			}

			trackEvent("pdf-exported", {
				programs: programs.length,
				withVariablesTable: variableSections.length > 0,
			});
			reset();
		},
		[reset, t, sectionTitle],
	);

	return { exportState, startExport, reset };
}
