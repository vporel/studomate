import type { jsPDF } from "jspdf";
import { renderSceneToJsPdf } from "@/ui/lib/program-export-drawing/backends/jspdf-backend";
import { LADDER_ZOOM } from "@/ui/lib/program-export-drawing/ladder-scene";
import { mmToPx } from "@/ui/lib/utils";
import { PAPERS_SIZES } from "@/ui/constants";
import renderMarkdownToPdf from "./markdown-to-pdf";
import {
	PdfCoverPage,
	PdfExportDocument,
	PdfExporter,
	PdfExportSection,
} from "./pdf-exporter";

/** Largeur et hauteur d'une page A4 en mm. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Marge intérieure des pages en mm. */
const MARGIN_MM = 15;
/** Hauteur réservée au titre au-dessus du dessin d'un programme, en mm. */
const TITLE_BAND_MM = 12;
/** Hauteur réservée à l'intitulé d'une section de ladder, en mm. */
const SECTION_HEADING_MM = 7;
/** Espace vertical entre deux sections de ladder sur une même page, en mm. */
const SECTION_GAP_MM = 8;

export class JsPdfExporter implements PdfExporter {
	async export(document: PdfExportDocument): Promise<void> {
		const { default: jsPDF } = await import("jspdf");

		const firstOrientation: "portrait" | "landscape" =
			!document.cover && document.sections[0]?.orientation === "landscape"
				? "landscape"
				: "portrait";

		const doc = new jsPDF({
			orientation: firstOrientation,
			unit: "mm",
			format: "a4",
			compress: true,
		});
		let firstPage = true;

		const startPage = (orientation: "portrait" | "landscape") => {
			if (!firstPage) doc.addPage("a4", orientation);
			firstPage = false;
		};

		if (document.cover) {
			startPage("portrait");
			await this.drawCover(doc, document.cover);
		}

		for (const section of document.sections) {
			const orientation =
				section.orientation === "landscape" ? "landscape" : "portrait";
			startPage(orientation);
			if (section.ladderSections) {
				this.drawLadderFlow(doc, section);
			} else if (section.scene) {
				this.drawGrafcetPage(doc, section, orientation);
			}
		}

		doc.save(`${document.filename}.pdf`);
	}

	private async drawCover(doc: jsPDF, cover: PdfCoverPage): Promise<void> {
		const contentWidth = A4_WIDTH_MM - 2 * MARGIN_MM;
		let y = 45;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(24);
		doc.text(doc.splitTextToSize(cover.projectName, contentWidth), MARGIN_MM, y);
		y += 16;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(12);
		if (cover.labels.author) {
			doc.text(cover.labels.author, MARGIN_MM, y);
			y += 7;
		}
		doc.text(cover.labels.exportedOn, MARGIN_MM, y);
		y += 7;
		doc.text(cover.labels.stats, MARGIN_MM, y);
		y += 16;

		if (cover.statement) {
			doc.setFont("helvetica", "bold");
			doc.setFontSize(14);
			doc.text(cover.labels.statementHeading, MARGIN_MM, y);
			y += 8;

			const { lexer } = await import("marked");
			renderMarkdownToPdf(
				doc,
				lexer(cover.statement),
				{
					x: MARGIN_MM,
					width: contentWidth,
					top: MARGIN_MM,
					bottom: A4_HEIGHT_MM - MARGIN_MM,
				},
				y,
			);
		}
	}

	private pageTitle(
		doc: jsPDF,
		title: string,
		pageWidth: number,
	): void {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text(
			doc.splitTextToSize(title, pageWidth - 2 * MARGIN_MM),
			MARGIN_MM,
			MARGIN_MM + 6,
		);
	}

	private drawGrafcetPage(
		doc: jsPDF,
		section: PdfExportSection,
		orientation: "portrait" | "landscape",
	): void {
		const pageWidth = orientation === "landscape" ? A4_HEIGHT_MM : A4_WIDTH_MM;
		const pageHeight = orientation === "landscape" ? A4_WIDTH_MM : A4_HEIGHT_MM;
		this.pageTitle(doc, section.title, pageWidth);

		const scene = section.scene!;
		const availableWidth = pageWidth - 2 * MARGIN_MM;
		const availableHeight = pageHeight - 2 * MARGIN_MM - TITLE_BAND_MM;
		const scale = Math.min(
			availableWidth / scene.width,
			availableHeight / scene.height,
		);
		const x = MARGIN_MM + (availableWidth - scene.width * scale) / 2;
		const y = MARGIN_MM + TITLE_BAND_MM;
		renderSceneToJsPdf(doc, scene, { x, y, scale });
	}

	/**
	 * Ladder : les sections coulent sur les pages à une **échelle commune** (calculée sur la
	 * section la plus large, plafonnée par `LADDER_ZOOM`) et sont **calées à gauche** — la barre
	 * d'alimentation garde donc la même abscisse d'une page à l'autre. Nouvelle page dès qu'une
	 * section ne tient plus.
	 */
	private drawLadderFlow(doc: jsPDF, section: PdfExportSection): void {
		const pageWidth = A4_HEIGHT_MM;
		const pageHeight = A4_WIDTH_MM;
		const availableWidth = pageWidth - 2 * MARGIN_MM;
		const bottom = pageHeight - MARGIN_MM;
		const sections = section.ladderSections!;

		const maxSceneWidth = Math.max(1, ...sections.map((s) => s.scene.width));
		const minSceneWidth = mmToPx(PAPERS_SIZES.A4_LANDSCAPE.width) / LADDER_ZOOM;
		const scale = availableWidth / Math.max(maxSceneWidth, minSceneWidth);

		this.pageTitle(doc, section.title, pageWidth);
		let y = MARGIN_MM + TITLE_BAND_MM;

		for (const { heading, scene } of sections) {
			const blockHeight = scene.height * scale;
			const needed = SECTION_HEADING_MM + blockHeight;
			const atPageTop = y <= MARGIN_MM + TITLE_BAND_MM + 0.01;
			if (!atPageTop && y + needed > bottom) {
				doc.addPage("a4", "landscape");
				y = MARGIN_MM;
			}

			doc.setFont("helvetica", "bold");
			doc.setFontSize(11);
			doc.text(heading, MARGIN_MM, y + 4);
			y += SECTION_HEADING_MM;

			renderSceneToJsPdf(doc, scene, { x: MARGIN_MM, y, scale });
			y += blockHeight + SECTION_GAP_MM;
		}
	}
}
