"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import type { ProgramExportConfig } from "@/ui/pdf/program-pdf";
import useLadderRenderContext from "@/ui/pdf/useLadderRenderContext";
import { useCallback, useRef } from "react";
import { toast } from "react-toastify";
import type { ImageFormat } from "./program-image-export";
import trackImageExported from "./track-image-exported";

/**
 * Downloads a single program as an image (a zip when a ladder spans several images), named
 * "<project> - <program>". The program is read from `getConfig` when the export starts. Calls made
 * while an export is running are ignored. Failures are reported with a toast.
 */
export default function useExportProgramImage(
	getConfig: () => ProgramExportConfig,
	format: ImageFormat,
): () => void {
	const projectName = useProjectStore((s) => s.project?.name ?? "export");
	const ladderContext = useLadderRenderContext();
	const t = useT("projects.export");
	const exportingRef = useRef(false);

	return useCallback(() => {
		if (exportingRef.current) return;
		exportingRef.current = true;
		const config = getConfig();
		const filename = `${projectName} - ${config.program.name}`;
		void import("./program-image-export")
			.then(({ buildImageRequests, exportProgramImages }) =>
				exportProgramImages(
					buildImageRequests([config], { projectName, filename }),
					format,
					filename,
					{ ladderContext },
				),
			)
			.then(() => trackImageExported({ format, programType: config.type }))
			.catch(() => toast.error(t("errorImages")))
			.finally(() => {
				exportingRef.current = false;
			});
	}, [getConfig, format, projectName, ladderContext, t]);
}
