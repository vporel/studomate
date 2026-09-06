/**
 * Clés `localStorage` de la disposition courante du stockage des projets locaux, et version de
 * cette disposition. Partagées par le repository et les migrations de disposition.
 */
export const LOCAL_STORAGE_LAYOUT_VERSION_KEY = "studomate_local_storage_version";

/** Version de disposition que cette version de l'app sait produire et lire. */
export const CURRENT_LAYOUT_VERSION = 1;

/**
 * Index des projets locaux, indexé par id : `{ [id]: { name } }`. Cette clé portait, en
 * disposition v0, le tableau complet des projets ; en v1 elle ne porte plus que l'index, le
 * contenu de chaque projet vivant sous `projectKey(id)`.
 */
export const PROJECTS_INDEX_KEY = "studomate_projects_data";

/** Clé portant la forme brute d'un projet (disposition v1). */
export function projectKey(id: string): string {
	return `studomate_project_${id}`;
}

/** Ce que l'index retient d'un projet — juste le nom pour l'instant (fenêtre d'ouverture). */
export type ProjectIndexEntry = { name: string };

export type ProjectIndex = Record<string, ProjectIndexEntry>;
