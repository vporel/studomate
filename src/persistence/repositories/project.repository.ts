import Project from "@/schemas/project/project.schema";

/**
 * Raison pour laquelle une sauvegarde a échoué.
 * - `quota-exceeded` : le stockage est plein (limite ~5 Mo en localStorage)
 * - `unavailable`    : le stockage est inaccessible (navigation privée, permissions)
 * - `network`        : le serveur distant est injoignable, ou la session a expiré
 * - `unknown`        : autre chose
 */
export type SaveFailureReason = "quota-exceeded" | "unavailable" | "network" | "unknown";

export type SaveResult = { ok: true } | { ok: false; reason: SaveFailureReason; cause?: unknown };

/**
 * Accès au stockage des projets.
 *
 * L'interface existe pour que le store ne dépende pas d'une implémentation : la feuille de
 * route prévoit une sauvegarde cloud, qui viendra s'y substituer sans toucher au store.
 *
 * Toutes les méthodes sont asynchrones, y compris pour l'implémentation localStorage
 * (synchrone en interne) : un futur repository réellement distant n'aura ainsi pas à changer
 * cette interface, ni les appelants.
 *
 * `save`/`delete` retournent un résultat au lieu de lever : un échec est un cas fonctionnel
 * normal (stockage plein, navigation privée, réseau) que l'interface doit pouvoir annoncer
 * honnêtement à l'utilisateur, pas une exception à avaler.
 */
export default interface ProjectRepository {
	list(): Promise<Project[]>;
	get(projectId: string): Promise<Project | null>;
	save(project: Project): Promise<SaveResult>;
	delete(projectId: string): Promise<SaveResult>;
}
