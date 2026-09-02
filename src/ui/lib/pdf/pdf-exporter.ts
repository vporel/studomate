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

export interface PdfExportSection {
	/** Titre affiché en haut de la page (ex. « GRAFCET — Feu tricolore »). */
	title: string;
	/** PNG (data URI) du programme déjà rasterisé, de ratio `imageWidth`/`imageHeight`. */
	imageDataUrl: string;
	imageWidth: number;
	imageHeight: number;
	orientation: PdfExportOrientation;
}

export interface PdfExportDocument {
	filename: string;
	cover?: PdfCoverPage;
	sections: PdfExportSection[];
}

export interface PdfExporter {
	export(document: PdfExportDocument): Promise<void>;
}
