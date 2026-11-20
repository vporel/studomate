"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { useCallback } from "react";
import { toast } from "react-toastify";
import type { PdfExportProgramConfig } from "./usePdfExport";
import trackPdfExported from "./track-pdf-exported";
import useLadderRenderContext from "./useLadderRenderContext";
import useSingleExportPageFrame from "./useSingleExportPageFrame";

/**
 * Downloads a single program as a PDF (no cover page), named "<project> - <program>".
 * Failures are reported with a toast.
 */
export default function useExportProgramPdf(
	config: PdfExportProgramConfig,
): () => void {
	const projectName = useProjectStore((s) => s.project?.name ?? "export");
	const ladderContext = useLadderRenderContext();
	const t = useT("projects.export");
	const buildPageFrame = useSingleExportPageFrame();

	return useCallback(() => {
		const { name } = config.program;
		void import("@/ui/pdf/program-pdf")
			.then(({ exportProgramPdf }) =>
				exportProgramPdf({
					config,
					filename: `${projectName} - ${name}`,
					sectionTitle: t(
						config.type === "grafcet"
							? "sectionTitleGrafcet"
							: "sectionTitleLadder",
						{ name },
					),
					pageFrame: buildPageFrame(),
					ladderContext: config.type === "ladder" ? ladderContext : undefined,
				}),
			)
			.then(() => trackPdfExported({ programs: 1, withVariablesTable: false }))
			.catch(() => toast.error(t("errorAssembling")));
	}, [config, projectName, ladderContext, t, buildPageFrame]);
}
