import type { jsPDF } from "jspdf";

/**
 * Rendu d'un tableau simple en PDF (jsPDF) : en-tête répété en haut de chaque page, hauteur de
 * ligne dérivée du texte renvoyé à la ligne. Le calcul de mise en page (`layoutPdfTable`) est
 * pur — la mesure du texte est injectée — pour rester testable sans jsPDF.
 *
 * Coordonnées et dimensions en millimètres.
 */

export interface PdfTableColumn {
	header: string;
	width: number;
	/** Police à chasse fixe (identifiants : mnémonique, adresse). */
	mono?: boolean;
}

export interface PdfTableModel {
	columns: PdfTableColumn[];
	rows: string[][];
}

export interface PdfTableArea {
	x: number;
	/** Haut du tableau sur la première page. */
	top: number;
	/** Haut du tableau sur les pages de continuation. */
	pageTop: number;
	/** Ordonnée maximale avant saut de page. */
	bottom: number;
}

export interface PdfTableStyle {
	fontSize: number;
	lineHeight: number;
	cellPaddingX: number;
	cellPaddingY: number;
	headerFill: string;
	gridColor: string;
}

export const DEFAULT_TABLE_STYLE: PdfTableStyle = {
	fontSize: 9,
	lineHeight: 4,
	cellPaddingX: 2,
	cellPaddingY: 1.6,
	headerFill: "#eeeeee",
	gridColor: "#999999",
};

/** Découpe un texte de cellule en lignes tenant dans `width` mm. */
type MeasureCell = (text: string, width: number, mono: boolean) => string[];

interface LaidOutRow {
	/** Lignes de texte par colonne. */
	cells: string[][];
	y: number;
	height: number;
	header: boolean;
}

export interface PdfTablePage {
	rows: LaidOutRow[];
}

export function layoutPdfTable(
	table: PdfTableModel,
	area: PdfTableArea,
	style: PdfTableStyle,
	measure: MeasureCell,
): PdfTablePage[] {
	const splitRow = (values: string[]): string[][] =>
		table.columns.map((column, i) =>
			measure(
				values[i] ?? "",
				column.width - 2 * style.cellPaddingX,
				!!column.mono,
			),
		);
	const heightOf = (cells: string[][]): number =>
		Math.max(1, ...cells.map((lines) => lines.length)) * style.lineHeight +
		2 * style.cellPaddingY;

	const headerCells = splitRow(table.columns.map((c) => c.header));
	const headerHeight = heightOf(headerCells);

	const pages: PdfTablePage[] = [];
	let rows: LaidOutRow[] = [];
	let y = area.top;

	const openPage = (topY: number) => {
		rows = [];
		y = topY;
		rows.push({ cells: headerCells, y, height: headerHeight, header: true });
		y += headerHeight;
	};
	const closePage = () => pages.push({ rows });

	openPage(area.top);
	for (const row of table.rows) {
		const cells = splitRow(row);
		const height = heightOf(cells);
		// `rows.length > 1` : ne jamais renvoyer une ligne seule sur une page ne portant que
		// l'en-tête (une ligne plus haute qu'une page déborde alors plutôt que de boucler).
		if (y + height > area.bottom && rows.length > 1) {
			closePage();
			openPage(area.pageTop);
		}
		rows.push({ cells, y, height, header: false });
		y += height;
	}
	closePage();
	return pages;
}

export function drawPdfTable(
	doc: jsPDF,
	table: PdfTableModel,
	area: PdfTableArea,
	onContinue: () => void,
	style: PdfTableStyle = DEFAULT_TABLE_STYLE,
): number {
	const measure: MeasureCell = (text, width, mono) => {
		doc.setFont(mono ? "courier" : "helvetica", "normal");
		doc.setFontSize(style.fontSize);
		return text === "" ? [""] : (doc.splitTextToSize(text, width) as string[]);
	};
	const pages = layoutPdfTable(table, area, style, measure);
	const totalWidth = table.columns.reduce((sum, c) => sum + c.width, 0);
	let lastY = area.top;

	pages.forEach((page, pageIndex) => {
		if (pageIndex > 0) onContinue();
		for (const row of page.rows) {
			doc.setDrawColor(style.gridColor);
			doc.setLineWidth(0.2);
			if (row.header) {
				doc.setFillColor(style.headerFill);
				doc.rect(area.x, row.y, totalWidth, row.height, "FD");
			}
			let x = area.x;
			table.columns.forEach((column, i) => {
				doc.rect(x, row.y, column.width, row.height, "S");
				doc.setFont(
					column.mono ? "courier" : "helvetica",
					row.header ? "bold" : "normal",
				);
				doc.setFontSize(style.fontSize);
				doc.setTextColor("#000000");
				row.cells[i].forEach((line, lineIndex) => {
					doc.text(
						line,
						x + style.cellPaddingX,
						row.y +
							style.cellPaddingY +
							style.lineHeight * (lineIndex + 1) -
							1,
					);
				});
				x += column.width;
			});
			lastY = row.y + row.height;
		}
	});
	return lastY;
}
