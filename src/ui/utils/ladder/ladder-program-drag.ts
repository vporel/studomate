/**
 * Type MIME du glisser-déposer d'un programme depuis le menu de l'explorateur vers le canevas
 * d'un ladder — source (explorateur) et cible (éditeur ladder) ne partagent aucun contexte React
 * commun (`LadderToolbarDnDProvider` n'entoure que la page ladder, voir `LadderPage.tsx`), d'où
 * le passage par `DataTransfer` natif plutôt que par un contexte, à la différence des outils de
 * la toolbar (contact/bobine).
 */
export const LADDER_PROGRAM_DRAG_MIME_TYPE =
	"application/x-studomate-ladder-program-id";
