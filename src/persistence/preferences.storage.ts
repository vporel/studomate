import { StorageLocation } from "./repositories/project.repository";

const STORAGE_KEY = "studomate_preferred_save_location";

/**
 * Lieu de stockage par défaut choisi par l'utilisateur (page Préférences, ou premier
 * enregistrement d'un projet neuf). `null` tant qu'aucun choix n'a jamais été fait — c'est ce qui
 * déclenche la modale de choix au tout premier enregistrement.
 */
export function getPreferredSaveLocation(): StorageLocation | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw === "local" || raw === "cloud" ? raw : null;
	} catch {
		return null;
	}
}

export function setPreferredSaveLocation(location: StorageLocation): void {
	try {
		localStorage.setItem(STORAGE_KEY, location);
	} catch {
		// Stockage indisponible : la préférence ne sera simplement pas retenue
	}
}
