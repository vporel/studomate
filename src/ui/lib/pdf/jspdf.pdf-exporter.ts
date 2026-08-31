import type { jsPDF } from "jspdf";
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
/** Hauteur réservée au titre au-dessus de l'image d'un programme, en mm. */
const TITLE_BAND_MM = 12;

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
			this.drawSection(doc, section, orientation);
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
		if (cover.author) {
			doc.text(`Auteur : ${cover.author}`, MARGIN_MM, y);
			y += 7;
		}
		doc.text(`Exporté le ${cover.date}`, MARGIN_MM, y);
		y += 7;
		doc.text(
			`${cover.stats.grafcets} grafcet(s), ${cover.stats.ladders} ladder(s), ${cover.stats.variables} variable(s)`,
			MARGIN_MM,
			y,
		);
		y += 16;

		if (cover.statement) {
			doc.setFont("helvetica", "bold");
			doc.setFontSize(14);
			doc.text("Énoncé", MARGIN_MM, y);
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

	private drawSection(
		doc: jsPDF,
		section: PdfExportSection,
		orientation: "portrait" | "landscape",
	): void {
		const pageWidth = orientation === "landscape" ? A4_HEIGHT_MM : A4_WIDTH_MM;
		const pageHeight = orientation === "landscape" ? A4_WIDTH_MM : A4_HEIGHT_MM;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text(
			doc.splitTextToSize(section.title, pageWidth - 2 * MARGIN_MM),
			MARGIN_MM,
			MARGIN_MM + 6,
		);

		const availableWidth = pageWidth - 2 * MARGIN_MM;
		const availableHeight = pageHeight - 2 * MARGIN_MM - TITLE_BAND_MM;
		const scale = Math.min(
			availableWidth / section.imageWidth,
			availableHeight / section.imageHeight,
		);
		const width = section.imageWidth * scale;
		const height = section.imageHeight * scale;
		const x = MARGIN_MM + (availableWidth - width) / 2;
		const y = MARGIN_MM + TITLE_BAND_MM;

		// "SLOW" : jsPDF deflate les données de l'image. Le dessin étant surtout du blanc et des
		// traits, le gain est massif (sinon l'image est stockée en RGB brut, ~24 Mo/page).
		doc.addImage(
			section.imageDataUrl,
			"PNG",
			x,
			y,
			width,
			height,
			undefined,
			"SLOW",
		);
	}
}
