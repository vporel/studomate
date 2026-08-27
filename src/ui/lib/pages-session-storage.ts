export type PagesSession = {
	pagesOrder: string[];
	activePageId: string | null;
};

const SESSION_KEY_PREFIX = "studomate_session_pages_";

/**
 * Onglets ouverts + page active d'un projet, propres à ce navigateur — état de **session** UI,
 * pas le contenu du projet (préfixe `studomate_session_`, à distinguer volontairement de
 * `studomate_projects_data`/`studomate_cloud_project_ids`, qui portent des données de projet).
 * Perdable sans gravité (navigation privée, stockage vidé) : sert seulement à retrouver son
 * affichage, jamais à reconstruire un projet.
 */
export function getPagesSession(projectId: string): PagesSession | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(SESSION_KEY_PREFIX + projectId);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed?.pagesOrder)) return null;
		return {
			pagesOrder: parsed.pagesOrder,
			activePageId: parsed.activePageId ?? null,
		};
	} catch {
		return null;
	}
}

export function setPagesSession(
	projectId: string,
	session: PagesSession,
): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(
			SESSION_KEY_PREFIX + projectId,
			JSON.stringify(session),
		);
	} catch {
		//Best-effort : perdre l'état de session n'est jamais grave, pas la peine de remonter l'échec
	}
}
