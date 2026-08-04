import Project from "@/schemas/project/project.schema";

/**
 * Raison pour laquelle une sauvegarde a échoué.
 * - `quota-exceeded` : le stockage est plein (limite ~5 Mo en localStorage)
 * - `unavailable`    : le stockage est inaccessible (navigation privée, permissions)
 * - `unknown`        : autre chose
 */
export type SaveFailureReason = "quota-exceeded" | "unavailable" | "unknown";

export type SaveResult = { ok: true } | { ok: false; reason: SaveFailureReason; cause?: unknown };

/**
 * Accès au stockage des projets.
 *
 * L'interface existe pour que le store ne dépende pas d'une implémentation : la feuille de
 * route prévoit une sauvegarde cloud, qui viendra s'y substituer sans toucher au store.
 *
 * `save` retourne un résultat au lieu de lever : un échec de sauvegarde est un cas
 * fonctionnel normal (stockage plein, navigation privée) que l'interface doit pouvoir
 * annoncer honnêtement à l'utilisateur, pas une exception à avaler.
 */
export default interface ProjectRepository {
	list(): Project[];
	get(projectId: string): Project | null;
	save(project: Project): SaveResult;
	delete(projectId: string): SaveResult;
}
