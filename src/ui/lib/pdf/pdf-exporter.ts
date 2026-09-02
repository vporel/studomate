import { Scene } from "@/ui/lib/program-export-drawing/draw-op";

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
	/** Ladder : une scène recadrée par section, avec son intitulé. */
	ladderSections?: { heading: string; scene: Scene }[];
}

export interface PdfExportDocument {
	filename: string;
	cover?: PdfCoverPage;
	sections: PdfExportSection[];
}

export interface PdfExporter {
	export(document: PdfExportDocument): Promise<void>;
}
