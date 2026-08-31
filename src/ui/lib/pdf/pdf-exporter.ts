export type PdfExportOrientation = "portrait" | "landscape";

/** Page de garde optionnelle, placée en tête du PDF pour un export de projet complet. */
export interface PdfCoverPage {
	projectName: string;
	author?: string;
	/** Date d'export déjà formatée (l'appelant maîtrise la locale et fige la valeur). */
	date: string;
	/** Énoncé de l'exercice en texte brut, absent s'il n'y en a pas. */
	statement?: string;
	stats: { grafcets: number; ladders: number; variables: number };
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
