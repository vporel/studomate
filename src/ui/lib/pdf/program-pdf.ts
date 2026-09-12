import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderRenderContext } from "@/ui/lib/program-export-drawing/ladder-render-context";
import renderProgramScenes from "@/ui/lib/program-export-drawing/program-scene";
import { JsPdfExporter } from "./jspdf.pdf-exporter";
import { PdfExportSection } from "./pdf-exporter";

export type ProgramExportConfig =
	| { type: "grafcet"; program: Grafcet }
	| { type: "ladder"; program: Ladder };

/**
 * Section PDF d'un programme : une scène portrait pour un GRAFCET, une scène paysage par section
 * pour un ladder. Lève si le rendu d'une scène échoue.
 */
export function buildProgramSection(
	config: ProgramExportConfig,
	sectionTitle: string,
	ladderContext?: LadderRenderContext,
): PdfExportSection {
	const pages = renderProgramScenes(config, ladderContext);
	if (config.type === "ladder") {
		return {
			title: sectionTitle,
			orientation: "landscape",
			ladderSections: pages.map((page) => ({
				heading: page.heading ?? "",
				description: page.description ?? "",
				scene: page.scene,
			})),
		};
	}
	return {
		title: sectionTitle,
		orientation: "portrait",
		scene: pages[0].scene,
	};
}

/**
 * Export PDF d'un seul programme, sans page de garde — pour l'action « Exporter » du menu
 * contextuel d'un éditeur. Rejette si le rendu ou la génération échoue.
 */
export async function exportProgramPdf(params: {
	config: ProgramExportConfig;
	filename: string;
	sectionTitle: string;
	ladderContext?: LadderRenderContext;
}): Promise<void> {
	await new JsPdfExporter().export({
		filename: params.filename,
		sections: [
			buildProgramSection(
				params.config,
				params.sectionTitle,
				params.ladderContext,
			),
		],
	});
}
