import type { jsPDF } from "jspdf";
import type { Token, Tokens } from "marked";

/** Zone de texte dans laquelle couler le Markdown rendu. */
export interface MarkdownPdfLayout {
	/** Marge gauche du texte, en mm. */
	x: number;
	/** Largeur utile du texte, en mm. */
	width: number;
	/** Ordonnée de reprise en haut d'une nouvelle page, en mm. */
	top: number;
	/** Ordonnée maximale avant saut de page, en mm. */
	bottom: number;
}

const PT_TO_MM = 0.3528;
const HEADING_SIZES = [17, 14, 12, 11, 11, 11];
const BODY_SIZE = 11;
const CODE_SIZE = 9;

const lineHeight = (sizePt: number) => sizePt * 1.15 * PT_TO_MM;

/** Symboles hors du jeu WinAnsi des polices intégrées de jsPDF : la police les rendrait avec un
 * espacement erratique (flèches surtout). On les translittère en ASCII avant tout
 * `text`/`splitTextToSize`. */
const SYMBOL_REPLACEMENTS: [RegExp, string][] = [
	[/[←⇐⟵]/g, "<-"],
	[/[↔⇔⟷]/g, "<->"],
	[/[→⇒⟶➔➙➜➡]/g, "->"],
	[/≤/g, "<="],
	[/≥/g, ">="],
	[/≠/g, "!="],
];

/** Codepoints CP1252 (0x80–0x9F) hors Latin-1 mais gérés par jsPDF — conservés tels quels. */
const WINANSI_EXTRAS =
	"€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

const NON_ENCODABLE = new RegExp(`[^\\x00-\\xFF${WINANSI_EXTRAS}]`, "g");

/** Rend une chaîne sûre pour les polices intégrées de jsPDF (Helvetica/Courier, encodage
 * WinAnsi) : translittère les symboles courants, supprime le reste. */
export function toPdfSafeText(text: string): string {
	let result = text;
	for (const [pattern, replacement] of SYMBOL_REPLACEMENTS) {
		result = result.replace(pattern, replacement);
	}
	return result.replace(NON_ENCODABLE, "");
}

/** Concatène le texte brut d'un jeton (récursif sur les jetons enfants). */
function plainText(token: Token): string {
	const withChildren = token as { tokens?: Token[] };
	if (Array.isArray(withChildren.tokens))
		return withChildren.tokens.map(plainText).join("");
	const leaf = token as { text?: string; raw?: string };
	return leaf.text ?? leaf.raw ?? "";
}

/**
 * Rend une liste de jetons Markdown (`marked.lexer`) dans le PDF à partir de `startY`,
 * en ajoutant des pages au besoin. Retourne l'ordonnée finale.
 *
 * Gère titres, paragraphes, listes (à puces / numérotées), citations, blocs de code et
 * séparateurs. Les emphases en ligne (`**gras**`, `` `code` ``) sont aplaties en texte : jsPDF
 * ne sait pas mélanger les styles au fil d'une ligne.
 */
export default function renderMarkdownToPdf(
	doc: jsPDF,
	tokens: Token[],
	layout: MarkdownPdfLayout,
	startY: number,
): number {
	let y = startY;

	const ensureSpace = (h: number) => {
		if (y + h > layout.bottom) {
			doc.addPage();
			y = layout.top;
		}
	};

	const writeBlock = (
		text: string,
		sizePt: number,
		style: "normal" | "bold",
		font: "helvetica" | "courier",
		indent: number,
	) => {
		doc.setFont(font, style);
		doc.setFontSize(sizePt);
		const lh = lineHeight(sizePt);
		for (const line of doc.splitTextToSize(
			toPdfSafeText(text),
			layout.width - indent,
		)) {
			ensureSpace(lh);
			doc.text(line, layout.x + indent, y);
			y += lh;
		}
	};

	for (const token of tokens) {
		switch (token.type) {
			case "heading": {
				const size = HEADING_SIZES[Math.min(token.depth - 1, 5)];
				y += lineHeight(size) * 0.6;
				writeBlock(plainText(token), size, "bold", "helvetica", 0);
				y += lineHeight(size) * 0.2;
				break;
			}
			case "paragraph": {
				writeBlock(plainText(token), BODY_SIZE, "normal", "helvetica", 0);
				y += lineHeight(BODY_SIZE) * 0.5;
				break;
			}
			case "list": {
				const list = token as Tokens.List;
				const start = Number(list.start) || 1;
				list.items.forEach((item, i) => {
					const prefix = list.ordered ? `${start + i}.` : "•";
					doc.setFont("helvetica", "normal");
					doc.setFontSize(BODY_SIZE);
					const lh = lineHeight(BODY_SIZE);
					const body = toPdfSafeText(
						item.tokens.map(plainText).join(" ").replace(/\s+/g, " ").trim(),
					);
					const lines = doc.splitTextToSize(body, layout.width - 7);
					lines.forEach((line: string, li: number) => {
						ensureSpace(lh);
						if (li === 0) doc.text(prefix, layout.x, y);
						doc.text(line, layout.x + 7, y);
						y += lh;
					});
				});
				y += lineHeight(BODY_SIZE) * 0.5;
				break;
			}
			case "code": {
				writeBlock((token as Tokens.Code).text, CODE_SIZE, "normal", "courier", 3);
				y += lineHeight(CODE_SIZE) * 0.5;
				break;
			}
			case "blockquote": {
				y = renderMarkdownToPdf(
					doc,
					(token as Tokens.Blockquote).tokens,
					{ ...layout, x: layout.x + 5, width: layout.width - 5 },
					y,
				);
				break;
			}
			case "hr": {
				ensureSpace(4);
				doc.setDrawColor(180);
				doc.line(layout.x, y, layout.x + layout.width, y);
				y += 4;
				break;
			}
			case "space": {
				y += lineHeight(BODY_SIZE) * 0.5;
				break;
			}
		}
	}

	return y;
}
