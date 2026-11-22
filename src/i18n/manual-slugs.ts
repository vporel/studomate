import type { Locale } from "./config";

/** URL slug of each top-level manual section (every section except the introduction), per locale. */
export const MANUAL_SLUGS: Record<Locale, Record<string, string>> = {
	fr: {
		"getting-started": "demarrage",
		projects: "projets",
		accounts: "comptes",
		explorer: "explorateur",
		variables: "variables",
		grafcet: "grafcet",
		ladder: "ladder",
		toolbar: "barre-d-outils",
		hmi: "interfaces-hmi",
		"cross-references": "references-croisees",
		simulation: "simulation",
		analysis: "analyse",
		hardware: "materiel",
		scene3d: "scene-3d",
		limits: "limites",
		troubleshooting: "depannage",
		shortcuts: "raccourcis-clavier",
	},
	en: {
		"getting-started": "getting-started",
		projects: "projects",
		accounts: "accounts",
		explorer: "explorer",
		variables: "variables",
		grafcet: "grafcet",
		ladder: "ladder",
		toolbar: "toolbar",
		hmi: "hmi",
		"cross-references": "cross-references",
		simulation: "simulation",
		analysis: "analysis",
		hardware: "hardware",
		scene3d: "scene-3d",
		limits: "limits",
		troubleshooting: "troubleshooting",
		shortcuts: "shortcuts",
	},
	es: {
		"getting-started": "primeros-pasos",
		projects: "proyectos",
		accounts: "cuentas",
		explorer: "explorador",
		variables: "variables",
		grafcet: "grafcet",
		ladder: "ladder",
		toolbar: "barra-de-herramientas",
		hmi: "interfaces-hmi",
		"cross-references": "referencias-cruzadas",
		simulation: "simulacion",
		analysis: "analisis",
		hardware: "hardware",
		scene3d: "escena-3d",
		limits: "limites",
		troubleshooting: "solucion-de-problemas",
		shortcuts: "atajos-de-teclado",
	},
};

/** Slug of a manual section in `locale`; the id itself when the section has none. */
export function manualSlug(locale: Locale, id: string): string {
	return MANUAL_SLUGS[locale][id] ?? id;
}

/** Section id behind a slug of `locale`, `null` when the slug is unknown. */
export function manualIdFromSlug(locale: Locale, slug: string): string | null {
	const entry = Object.entries(MANUAL_SLUGS[locale]).find(
		([, s]) => s === slug,
	);
	return entry ? entry[0] : null;
}
