/**
 * Une migration de la **disposition** du `localStorage` (quelles clés, comment les projets y
 * sont rangés) — à ne pas confondre avec les migrations de `../schema/`, qui font évoluer la
 * forme d'un projet donné.
 *
 * Une migration de disposition opère directement sur `localStorage` (lecture et écriture de
 * clés). Elle passe la disposition de la version `from` à `from + 1`.
 *
 * Elle ne doit jamais corrompre les données existantes si elle échoue en cours de route
 * (quota atteint, notamment) : tant que la nouvelle version n'est pas posée, l'ancienne
 * disposition doit rester lisible telle quelle.
 */
export type LayoutMigration = {
	from: number;
	description: string;
	migrate: () => void;
};

/** Disposition écrite avant l'introduction du versionnement, reconnue à l'absence de la clé. */
export const UNVERSIONED_LAYOUT = 0;
