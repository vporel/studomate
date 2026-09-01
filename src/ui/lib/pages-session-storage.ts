export type PagesSession = {
	pagesOrder: string[];
	activePageId: string | null;
};

type StoredSession = PagesSession & { updatedAt: number };

const STORAGE_KEY = "studomate_session_pages";

/**
 * Nombre maximum de projets pour lesquels on conserve les onglets ouverts. Au-delà, les entrées
 * les moins récemment écrites (`updatedAt`) sont évincées : `localStorage` est borné et cet état
 * est perdable sans gravité.
 */
const MAX_SESSIONS = 40;

/**
 * Onglets ouverts + page active de chaque projet, propres à ce navigateur — état de **session**
 * UI, pas le contenu du projet (clé `studomate_session_pages`, à distinguer volontairement de
 * `studomate_projects_data`/`studomate_cloud_project_ids`, qui portent des données de projet).
 * Tout est regroupé dans un seul objet `{ [projectId]: { …, updatedAt } }`. Perdable sans gravité
 * (navigation privée, stockage vidé) : sert seulement à retrouver son affichage, jamais à
 * reconstruire un projet.
 */
export function getPagesSession(projectId: string): PagesSession | null {
	if (typeof localStorage === "undefined") return null;
	const entry = readAll()[projectId];
	if (!entry) return null;
	return { pagesOrder: entry.pagesOrder, activePageId: entry.activePageId };
}

export function setPagesSession(
	projectId: string,
	session: PagesSession,
): void {
	if (typeof localStorage === "undefined") return;
	const all = readAll();
	all[projectId] = {
		pagesOrder: session.pagesOrder,
		activePageId: session.activePageId,
		updatedAt: Date.now(),
	};
	writeAll(evictOldest(all));
}

/** Supprime l'état de session d'un projet — à appeler quand le projet lui-même est supprimé. */
export function clearPagesSession(projectId: string): void {
	if (typeof localStorage === "undefined") return;
	const all = readAll();
	if (!(projectId in all)) return;
	delete all[projectId];
	writeAll(all);
}

type SessionMap = Record<string, StoredSession>;

function readAll(): SessionMap {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		if (!parsed || typeof parsed !== "object") return {};
		const map: SessionMap = {};
		for (const [id, value] of Object.entries(parsed)) {
			const entry = normalize(value);
			if (entry) map[id] = entry;
		}
		return map;
	} catch {
		return {};
	}
}

function writeAll(map: SessionMap): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		//Best-effort : perdre l'état de session n'est jamais grave, pas la peine de remonter l'échec
	}
}

function normalize(value: unknown): StoredSession | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Record<string, unknown>;
	if (!Array.isArray(candidate.pagesOrder)) return null;
	return {
		pagesOrder: candidate.pagesOrder.filter(
			(id): id is string => typeof id === "string",
		),
		activePageId:
			typeof candidate.activePageId === "string"
				? candidate.activePageId
				: null,
		updatedAt:
			typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
	};
}

/** Ne garde que les `MAX_SESSIONS` projets les plus récemment écrits. */
function evictOldest(map: SessionMap): SessionMap {
	const ids = Object.keys(map);
	if (ids.length <= MAX_SESSIONS) return map;
	const keep = ids
		.sort((a, b) => map[b].updatedAt - map[a].updatedAt)
		.slice(0, MAX_SESSIONS);
	const kept: SessionMap = {};
	for (const id of keep) kept[id] = map[id];
	return kept;
}
