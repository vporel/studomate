import Project from "@/schemas/project/project.schema";

/**
 * Raison pour laquelle une sauvegarde a échoué.
 * - `quota-exceeded` : le stockage est plein (limite ~5 Mo en localStorage)
 * - `unavailable`    : le stockage est inaccessible (navigation privée, permissions)
 * - `network`        : le serveur distant est injoignable, ou la session a expiré
 * - `conflict`       : le projet cloud a été modifié par un autre appareil depuis son chargement
 * - `unknown`        : autre chose
 */
export type SaveFailureReason =
	"quota-exceeded" | "unavailable" | "network" | "conflict" | "unknown";

export type SaveResult =
	{ ok: true } | { ok: false; reason: SaveFailureReason; cause?: unknown };

export type ShareResult =
	{ ok: true; token: string } | { ok: false; message: string };

/** Lieu de stockage d'un projet — pertinent uniquement pour `HybridProjectRepository`, qui
 * seul a le choix entre les deux ; les autres implémentations l'ignorent. */
export type StorageLocation = "local" | "cloud";

/**
 * Accès au stockage des projets — abstrait pour que le store ne dépende pas d'une
 * implémentation (localStorage, Supabase, hybride).
 *
 * Toutes les méthodes sont asynchrones, y compris l'implémentation localStorage (synchrone en
 * interne).
 *
 * `save`/`delete` retournent un `SaveResult` au lieu de lever : un échec (stockage plein,
 * navigation privée, réseau) est un cas fonctionnel à annoncer à l'utilisateur, pas une
 * exception à avaler.
 */
export default interface ProjectRepository {
	list(): Promise<Project[]>;
	get(projectId: string): Promise<Project | null>;
	/**
	 * `location` ne force un choix que pour un projet encore inconnu de ce repository (premier
	 * enregistrement) — un projet déjà rangé quelque part garde son emplacement, quel que soit
	 * `location`. Absent, le comportement par défaut (local pour un id inconnu) s'applique.
	 */
	save(project: Project, location?: StorageLocation): Promise<SaveResult>;
	delete(projectId: string): Promise<SaveResult>;
}

/**
 * Extension du repository pour les projets cloud partageables.
 * Implémentée par `SupabaseProjectRepository` et `HybridProjectRepository` (qui délègue au cloud).
 */
export interface ShareableProjectRepository extends ProjectRepository {
	getByShareToken(token: string): Promise<Project | null>;
	getShareToken(projectId: string): Promise<string | null>;
	createShareToken(projectId: string): Promise<ShareResult>;
	deleteShareToken(projectId: string): Promise<SaveResult>;
}

export function isShareable(repo: unknown): repo is ShareableProjectRepository {
	const candidate = repo as ShareableProjectRepository;
	return (
		typeof candidate.getByShareToken === "function" &&
		typeof candidate.getShareToken === "function" &&
		typeof candidate.createShareToken === "function" &&
		typeof candidate.deleteShareToken === "function"
	);
}
