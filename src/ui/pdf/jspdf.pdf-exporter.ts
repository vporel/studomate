import { renderSceneToJsPdf } from "@/ui/lib/drawing/backends/jspdf-backend";
import layoutLadderFlow, {
	maxDescriptionLines,
	truncateDescriptionLines,
} from "./drawing/ladder-flow-layout";
import { LADDER_ZOOM } from "./drawing/ladder-scene";
import { mmToPx } from "@/ui/lib/screen-units";
import type { jsPDF } from "jspdf";
import renderMarkdownToPdf from "@/ui/lib/pdf/markdown-to-pdf";
import {
	PdfCoverPage,
	PdfExportDocument,
	PdfExporter,
	PdfExportSection,
	PdfFrameText,
	PdfPageFrame,
	PDF_PAGE_NUMBER,
} from "./pdf-exporter";
import { drawPdfTable } from "@/ui/lib/pdf/pdf-table";

/** Largeur et hauteur d'une page A4 en mm. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Marge intérieure des pages en mm. */
const MARGIN_MM = 15;
/** Hauteur réservée au titre au-dessus du dessin d'un programme, en mm. */
const TITLE_BAND_MM = 12;
/** Corps du titre d'une page de programme, en points. */
const PAGE_TITLE_FONT_PT = 14;
/** Corps du nom du projet sur la page de garde, en points. */
const COVER_TITLE_FONT_PT = 24;
/** Interligne de jsPDF (`lineHeightFactor` par défaut), et conversion point → millimètre. */
const LINE_HEIGHT_FACTOR = 1.15;
const MM_PER_PT = 25.4 / 72;

/** Hauteur d'une ligne de texte de corps `fontPt` points, en mm. */
const lineHeightMm = (fontPt: number) =>
	fontPt * LINE_HEIGHT_FACTOR * MM_PER_PT;
/** Hauteur réservée à l'intitulé d'une section de ladder, en mm. */
const SECTION_HEADING_MM = 7;
/** Espace vertical entre deux sections de ladder sur une même page, en mm. */
const SECTION_GAP_MM = 8;
/** Corps de la description d'une section de ladder, en points. */
const SECTION_DESC_FONT_PT = 9;
/** Interligne de la description d'une section de ladder, en mm. */
const SECTION_DESC_LINE_MM = 4;
/** Espace entre la description d'une section et son dessin, en mm. */
const SECTION_DESC_GAP_MM = 2;
/** Font size and grey level (0-255) of the header and footer. */
const FRAME_FONT_PT = 9;
const FRAME_GREY = 110;
/** Distance between the page edge and the baseline of the header / footer, in mm. */
const FRAME_EDGE_MM = 9;
/** Niveau de gris (0-255) du trait séparant deux sections de ladder sur une même page. */
const SECTION_SEPARATOR_GREY = 180;

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

		let coverPages = 0;
		if (document.cover) {
			startPage("portrait");
			await this.drawCover(doc, document.cover);
			coverPages = doc.getNumberOfPages();
		}

		for (const section of document.sections) {
			const orientation =
				section.orientation === "landscape" ? "landscape" : "portrait";
			startPage(orientation);
			if (section.ladderSections) {
				this.drawLadderFlow(doc, section);
			} else if (section.scene) {
				this.drawGrafcetPage(doc, section, orientation);
			} else if (section.table) {
				this.drawTablePage(doc, section, orientation);
			}
		}

		if (document.pageFrame)
			this.drawPageFrames(doc, document.pageFrame, {
				frame: document.coverPageFrame,
				pages: coverPages,
			});

		doc.save(`${document.filename}.pdf`);
	}

	private drawPageFrames(
		doc: jsPDF,
		pageFrame: PdfPageFrame,
		cover: { frame?: PdfPageFrame; pages: number },
	): void {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(FRAME_FONT_PT);
		doc.setTextColor(FRAME_GREY);
		const total = doc.getNumberOfPages();
		for (let page = 1; page <= total; page++) {
			doc.setPage(page);
			const frame =
				page <= cover.pages && cover.frame ? cover.frame : pageFrame;
			const width = doc.internal.pageSize.getWidth();
			const height = doc.internal.pageSize.getHeight();
			const headerY = FRAME_EDGE_MM;
			const footerY = height - FRAME_EDGE_MM;
			const zones: [
				PdfFrameText | undefined,
				number,
				number,
				"left" | "center" | "right",
			][] = [
				[frame.headerLeft, MARGIN_MM, headerY, "left"],
				[frame.headerCenter, width / 2, headerY, "center"],
				[frame.headerRight, width - MARGIN_MM, headerY, "right"],
				[frame.footerLeft, MARGIN_MM, footerY, "left"],
				[frame.footerCenter, width / 2, footerY, "center"],
				[frame.footerRight, width - MARGIN_MM, footerY, "right"],
			];
			for (const [text, x, y, align] of zones) {
				if (text)
					doc.text(text === PDF_PAGE_NUMBER ? `${page}/${total}` : text, x, y, {
						align,
					});
			}
		}
		doc.setTextColor(0);
	}

	private async drawCover(doc: jsPDF, cover: PdfCoverPage): Promise<void> {
		const contentWidth = A4_WIDTH_MM - 2 * MARGIN_MM;
		let y = 45;

		doc.setFont("helvetica", "bold");
		doc.setFontSize(COVER_TITLE_FONT_PT);
		const titleLines = doc.splitTextToSize(cover.projectName, contentWidth);
		doc.text(titleLines, MARGIN_MM, y);
		y += 16 + (titleLines.length - 1) * lineHeightMm(COVER_TITLE_FONT_PT);

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

	/** Draws the title of a program page and returns the height it takes above the drawing, in mm. */
	private pageTitle(doc: jsPDF, title: string, pageWidth: number): number {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(PAGE_TITLE_FONT_PT);
		const lines = doc.splitTextToSize(title, pageWidth - 2 * MARGIN_MM);
		doc.text(lines, MARGIN_MM, MARGIN_MM + 6);
		return (
			TITLE_BAND_MM + (lines.length - 1) * lineHeightMm(PAGE_TITLE_FONT_PT)
		);
	}

	private drawGrafcetPage(
		doc: jsPDF,
		section: PdfExportSection,
		orientation: "portrait" | "landscape",
	): void {
		const pageWidth = orientation === "landscape" ? A4_HEIGHT_MM : A4_WIDTH_MM;
		const pageHeight = orientation === "landscape" ? A4_WIDTH_MM : A4_HEIGHT_MM;
		const titleBand = this.pageTitle(doc, section.title, pageWidth);

		const scene = section.scene!;
		const availableWidth = pageWidth - 2 * MARGIN_MM;
		const availableHeight = pageHeight - 2 * MARGIN_MM - titleBand;
		const scale = Math.min(
			availableWidth / scene.width,
			availableHeight / scene.height,
		);
		const x = MARGIN_MM + (availableWidth - scene.width * scale) / 2;
		const y = MARGIN_MM + titleBand;
		renderSceneToJsPdf(doc, scene, { x, y, scale });
	}

	private drawTablePage(
		doc: jsPDF,
		section: PdfExportSection,
		orientation: "portrait" | "landscape",
	): void {
		const pageWidth = orientation === "landscape" ? A4_HEIGHT_MM : A4_WIDTH_MM;
		const pageHeight = orientation === "landscape" ? A4_WIDTH_MM : A4_HEIGHT_MM;
		const titleBand = this.pageTitle(doc, section.title, pageWidth);
		drawPdfTable(
			doc,
			section.table!,
			{
				x: MARGIN_MM,
				top: MARGIN_MM + titleBand,
				pageTop: MARGIN_MM,
				bottom: pageHeight - MARGIN_MM,
			},
			() => doc.addPage("a4", orientation),
		);
	}

	/**
	 * Ladder: the sections flow over the pages following `layoutLadderFlow` (common scale,
	 * left-aligned, a new page as soon as a section no longer fits).
	 */
	private drawLadderFlow(doc: jsPDF, section: PdfExportSection): void {
		const pageWidth = A4_HEIGHT_MM;
		const pageHeight = A4_WIDTH_MM;
		const availableWidth = pageWidth - 2 * MARGIN_MM;
		const sections = section.ladderSections!;

		const titleBand = this.pageTitle(doc, section.title, pageWidth);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(SECTION_DESC_FONT_PT);
		const maxLines = maxDescriptionLines({
			pageHeight,
			margin: MARGIN_MM,
			firstPageTop: MARGIN_MM + titleBand,
			headingHeight: SECTION_HEADING_MM,
			lineHeight: SECTION_DESC_LINE_MM,
			descriptionGap: SECTION_DESC_GAP_MM,
		});
		const headings = sections.map(({ description }) => {
			const lines = description
				? truncateDescriptionLines(
						doc.splitTextToSize(description, availableWidth) as string[],
						maxLines,
					)
				: [];
			const blockHeight =
				SECTION_HEADING_MM +
				(lines.length
					? lines.length * SECTION_DESC_LINE_MM + SECTION_DESC_GAP_MM
					: 0);
			return { lines, blockHeight };
		});

		const { scale, placements } = layoutLadderFlow({
			blocks: sections.map(({ scene }, i) => ({
				headerHeight: headings[i].blockHeight,
				sceneWidth: scene.width,
				sceneHeight: scene.height,
			})),
			pageWidth,
			pageHeight,
			margin: MARGIN_MM,
			firstPageTop: MARGIN_MM + titleBand,
			gap: SECTION_GAP_MM,
			minSceneWidth: mmToPx(A4_HEIGHT_MM) / LADDER_ZOOM,
		});

		let currentPage = 0;
		sections.forEach(({ heading, scene }, i) => {
			const { lines } = headings[i];
			const placement = placements[i];
			if (placement.page !== currentPage) {
				doc.addPage("a4", "landscape");
				currentPage = placement.page;
			}
			let y = placement.y;

			if (placement.separatorY !== null) {
				doc.setDrawColor(SECTION_SEPARATOR_GREY);
				doc.line(
					MARGIN_MM,
					placement.separatorY,
					pageWidth - MARGIN_MM,
					placement.separatorY,
				);
				doc.setDrawColor(0);
			}

			doc.setFont("helvetica", "bold");
			doc.setFontSize(11);
			doc.text(heading, MARGIN_MM, y + 4);
			y += SECTION_HEADING_MM;

			if (lines.length) {
				doc.setFont("helvetica", "normal");
				doc.setFontSize(SECTION_DESC_FONT_PT);
				doc.text(lines, MARGIN_MM, y + SECTION_DESC_LINE_MM - 1);
				y += lines.length * SECTION_DESC_LINE_MM + SECTION_DESC_GAP_MM;
			}

			renderSceneToJsPdf(doc, scene, { x: MARGIN_MM, y, scale });
		});
	}
}
