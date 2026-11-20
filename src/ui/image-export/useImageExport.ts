"use client";

import { useT } from "@/ui/i18n/useT";
import { LadderRenderContext } from "@/ui/pdf/drawing/ladder-render-context";
import { useCallback, useState } from "react";
import {
	exportProgramImages,
	ImageFormat,
	ProgramImageRequest,
} from "./program-image-export";
import trackImageExported from "./track-image-exported";

export type ImageExportState =
	| { status: "idle" }
	| { status: "rendering"; current: number; total: number; label: string }
	| { status: "error"; message: string };

export interface UseImageExportResult {
	exportState: ImageExportState;
	startExport: (
		requests: ProgramImageRequest[],
		format: ImageFormat,
		archiveName: string,
		ladderContext?: LadderRenderContext,
	) => Promise<void>;
	reset: () => void;
}

/** Gives the thread back for one repaint so the progress bar shows between two programs. */
const yieldToPaint = () =>
	new Promise<void>((resolve) => setTimeout(resolve, 0));

export function useImageExport(): UseImageExportResult {
	const t = useT("projects.export");
	const [exportState, setExportState] = useState<ImageExportState>({
		status: "idle",
	});

	const reset = useCallback(() => setExportState({ status: "idle" }), []);

	const startExport = useCallback(
		async (
			requests: ProgramImageRequest[],
			format: ImageFormat,
			archiveName: string,
			ladderContext?: LadderRenderContext,
		) => {
			if (requests.length === 0) return;
			try {
				await exportProgramImages(requests, format, archiveName, {
					ladderContext,
					onProgress: async (progress) => {
						setExportState({ status: "rendering", ...progress });
						await yieldToPaint();
					},
				});
				for (const { config } of requests)
					trackImageExported({ format, programType: config.type });
				reset();
			} catch {
				setExportState({ status: "error", message: t("errorImages") });
			}
		},
		[reset, t],
	);

	return { exportState, startExport, reset };
}
