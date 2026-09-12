import { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import { LayoutMigration } from "./layout-migration";
import { PROJECTS_INDEX_KEY, ProjectIndex, projectKey } from "./keys";

/**
 * v0 → v1 : passe du tableau unique `studomate_projects_data` (tous les projets sous une seule
 * clé, réécrite en entier à chaque enregistrement) à une clé par projet
 * (`studomate_project_<id>`) plus un index `{ [id]: { name } }` qui **remplace** le contenu de
 * `studomate_projects_data`.
 *
 * Robustesse :
 * - les clés par projet sont écrites **avant** que l'index n'écrase le tableau v0 ; une coupure
 *   (quota) avant l'écriture de l'index laisse `studomate_projects_data` intact et lisible en v0,
 *   la version n'est pas posée, la prochaine tentative repart du tableau complet ;
 * - si `studomate_projects_data` porte déjà un objet (l'index), c'est qu'une tentative
 *   précédente a tout écrit sauf la version : on ne refait rien, les clés projet sont en place.
 */
const v0ToV1: LayoutMigration = {
	from: 0,
	description:
		"One localStorage key per project plus an {id: {name}} index",
	migrate: () => {
		const parsed = safeParse(localStorage.getItem(PROJECTS_INDEX_KEY));

		//Déjà un objet : l'index existe, seule la pose de version avait échoué — rien à refaire.
		if (isPlainObject(parsed)) return;

		const raws = Array.isArray(parsed) ? decodeLegacyArray(parsed) : [];
		const index: ProjectIndex = {};
		for (const raw of raws) {
			const id = typeof raw.id === "string" ? raw.id : null;
			if (id === null) continue;
			localStorage.setItem(projectKey(id), JSON.stringify(raw));
			index[id] = {
				name: typeof raw.name === "string" ? raw.name : DEFAULT_PROJECT_NAME,
			};
		}

		localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
	},
};

function safeParse(raw: string | null): unknown {
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Absorbe l'ancien format v0 où chaque entrée du tableau était elle-même une chaîne JSON
 * (double échappement).
 */
function decodeLegacyArray(entries: unknown[]): Record<string, any>[] {
	return entries
		.map((entry) => {
			if (typeof entry !== "string") return entry;
			try {
				return JSON.parse(entry);
			} catch {
				return null;
			}
		})
		.filter((p): p is Record<string, any> => !!p && typeof p === "object");
}

export default v0ToV1;
