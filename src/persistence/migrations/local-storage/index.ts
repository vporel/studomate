import { LayoutMigration, UNVERSIONED_LAYOUT } from "./layout-migration";
import {
	CURRENT_LAYOUT_VERSION,
	LOCAL_STORAGE_LAYOUT_VERSION_KEY,
} from "./keys";
import v0ToV1 from "./v0-to-v1";

/**
 * Les migrations de disposition, dans l'ordre. En ajouter une : un fichier `vN-to-vN+1.ts`, une
 * ligne ici, et incrémenter `CURRENT_LAYOUT_VERSION` dans `./keys`.
 */
const LAYOUT_MIGRATIONS: LayoutMigration[] = [v0ToV1];

/**
 * Version de la disposition du `localStorage` telle qu'écrite sur ce navigateur. `0` (v0) tant
 * que la clé est absente : c'est le cas de tous les utilisateurs d'avant l'introduction du
 * versionnement.
 */
export function readLayoutVersion(): number {
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_LAYOUT_VERSION_KEY);
		const parsed = raw === null ? UNVERSIONED_LAYOUT : Number(raw);
		return Number.isInteger(parsed) && parsed >= 0
			? parsed
			: UNVERSIONED_LAYOUT;
	} catch {
		return UNVERSIONED_LAYOUT;
	}
}

/**
 * Amène la disposition du `localStorage` à la version courante en appliquant les migrations
 * manquantes, puis retourne la version effective.
 *
 * Best-effort : si une migration lève (quota atteint le plus souvent), on n'écrit pas la
 * nouvelle version et on retourne la dernière version réellement atteinte — le repository
 * continue alors de fonctionner dans l'ancienne disposition, et un prochain appel retentera.
 */
export function ensureLocalStorageLayout(
	migrations: LayoutMigration[] = LAYOUT_MIGRATIONS,
): number {
	let current = readLayoutVersion();
	if (current >= CURRENT_LAYOUT_VERSION) return current;

	for (const migration of migrations) {
		if (migration.from !== current) continue;
		try {
			migration.migrate();
			current = migration.from + 1;
			localStorage.setItem(
				LOCAL_STORAGE_LAYOUT_VERSION_KEY,
				String(current),
			);
		} catch (e) {
			console.error(
				`Migration de disposition localStorage depuis la v${migration.from} interrompue :`,
				e,
			);
			return current;
		}
	}
	return current;
}
