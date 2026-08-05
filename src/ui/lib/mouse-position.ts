/**
 * Dernière position connue du curseur, en dehors de tout state réactif (React ou zustand).
 *
 * Elle n'est lue qu'ponctuellement (ex. commande coller), jamais souscrite par un composant —
 * la faire vivre dans le state du store forcerait des centaines de `setState()` par seconde
 * pour chaque mouvement de souris, sans qu'aucun rendu n'en dépende réellement.
 */
let mousePosition = { x: 0, y: 0 };

export function setLastMousePosition(x: number, y: number): void {
	mousePosition = { x, y };
}

export function getLastMousePosition(): { x: number; y: number } {
	return mousePosition;
}
