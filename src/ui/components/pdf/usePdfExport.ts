"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { JsPdfExporter } from "@/ui/lib/pdf/jspdf.pdf-exporter";
import { PdfExportSection } from "@/ui/lib/pdf/pdf-exporter";
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
	) => Promise<void>;
	reset: () => void;
}

/** Rend la main au thread de rendu le temps de deux frames : la première laisse React
 * committer, la seconde garantit qu'un paint a eu lieu (barre de progression, démontage). */
const nextFrame = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);

export function usePdfExport(): UsePdfExportResult {
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
		async (programs: PdfExportProgramConfig[], filename: string) => {
			if (programs.length === 0) return;

			const total = programs.length;
			setExportState({
				status: "rendering",
				current: 0,
				total,
				label: "Montage en cours…",
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
					const dataUrl = await domToImage.toPng(element, {
						width: element.offsetWidth,
						height: element.offsetHeight,
						bgcolor: "white",
					});
					const img = document.createElement("img");
					img.src = dataUrl;
					img.style.width = "100%";
					img.style.height = "100%";
					const wrapper = document.createElement("div");
					wrapper.style.cssText = "width:100%;height:100%;background:white;";
					wrapper.appendChild(img);
					sections.push({
						label: config.program.name,
						element: wrapper,
						orientation: config.type === "ladder" ? "landscape" : "portrait",
					});
				} catch {
					setExportState({
						status: "error",
						message: `La capture de "${config.program.name}" a échoué.`,
					});
					setOffscreenPrograms([]);
					return;
				}

				setOffscreenPrograms([]);
				await nextFrame();
			}

			setExportState({ status: "assembling" });
			try {
				await new JsPdfExporter().export(sections, filename);
			} catch {
				setExportState({
					status: "error",
					message: "La génération du PDF a échoué.",
				});
				return;
			}

			reset();
		},
		[reset],
	);

	return { exportState, offscreenPrograms, onProgramReady, startExport, reset };
}
