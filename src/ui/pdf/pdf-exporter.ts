import { Scene } from "@/ui/lib/drawing/draw-op";
import { PdfTableModel } from "@/ui/lib/pdf/pdf-table";

export type PdfExportOrientation = "portrait" | "landscape";

/** Libellés localisés de la page de garde, déjà interpolés par l'appelant (qui maîtrise la
 * langue de l'interface). */
export interface PdfCoverLabels {
	/** Ligne auteur complète (ex. « Auteur : Alice »), absente s'il n'y a pas d'auteur. */
	author?: string;
	/** Ligne de date complète (ex. « Exporté le 01/09/2026 »). */
	exportedOn: string;
	/** Ligne de statistiques complète (ex. « 2 grafcet(s), 1 ladder(s), 5 variable(s) »). */
	stats: string;
	/** Titre de la section énoncé (ex. « Énoncé »). */
	statementHeading: string;
}

/** Page de garde optionnelle, placée en tête du PDF pour un export de projet complet. */
export interface PdfCoverPage {
	projectName: string;
	author?: string;
	/** Date d'export déjà formatée (l'appelant maîtrise la locale et fige la valeur). */
	date: string;
	/** Énoncé de l'exercice en texte brut, absent s'il n'y en a pas. */
	statement?: string;
	stats: { grafcets: number; ladders: number; variables: number };
	labels: PdfCoverLabels;
}

/** Un programme à exporter. Un GRAFCET tient sur une page (`scene`). Un ladder est découpé en
 * sous-sections (`ladderSections`) que l'exporter fait couler sur les pages à une échelle
 * commune — la barre d'alimentation reste alignée d'une page à l'autre. Exactement l'un des deux
 * champs est renseigné. */
export interface PdfExportSection {
	/** Titre affiché en haut de la (première) page (ex. « GRAFCET — Feu tricolore »). */
	title: string;
	orientation: PdfExportOrientation;
	/** GRAFCET : scène unique. */
	scene?: Scene;
	/** Ladder : une scène recadrée par section, avec son intitulé et sa description (vide si absente). */
	ladderSections?: { heading: string; description: string; scene: Scene }[];
	/** Tableau (table des variables) : coulé sur les pages, ligne d'en-tête répétée. */
	table?: PdfTableModel;
}

/** Page number "n/N" to place in a frame zone, computed on each page (the cover pages count). Any
 * other zone text is drawn verbatim. */
export const PDF_PAGE_NUMBER = Symbol("pdfPageNumber");

export type PdfFrameText = string | typeof PDF_PAGE_NUMBER;

/** Running text repeated on every page: three zones (left, center, right) in the header and in
 * the footer. */
export interface PdfPageFrame {
	headerLeft?: PdfFrameText;
	headerCenter?: PdfFrameText;
	headerRight?: PdfFrameText;
	footerLeft?: PdfFrameText;
	footerCenter?: PdfFrameText;
	footerRight?: PdfFrameText;
}

export interface PdfExportDocument {
	filename: string;
	cover?: PdfCoverPage;
	pageFrame?: PdfPageFrame;
	/** Replaces `pageFrame` on every page of the cover (a long statement can run over several). */
	coverPageFrame?: PdfPageFrame;
	sections: PdfExportSection[];
}

export interface PdfExporter {
	export(document: PdfExportDocument): Promise<void>;
}
