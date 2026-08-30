import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

export const LADDER_REORDER_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions =
	{
		draggable:
			"Pour réordonner une section : Espace ou Entrée pour la saisir, " +
			"flèches haut et bas pour la déplacer, Espace ou Entrée pour déposer, " +
			"Échap pour annuler.",
	};

/** Annonces vocales (région `aria-live` de dnd-kit) du réordonnancement des sections Ladder :
 * dnd-kit ne fournit que des annonces en anglais par défaut. Les sections n'ont pas de numéro
 * propre — leur position (1-based) sert de repère. */
export default function buildLadderReorderAnnouncements(
	sectionIdsInOrder: string[],
): Announcements {
	const positionOf = (id: string | number) =>
		sectionIdsInOrder.indexOf(String(id)) + 1;

	return {
		onDragStart({ active }) {
			return `Section ${positionOf(active.id)} saisie.`;
		},
		onDragOver({ active, over }) {
			if (over) {
				return `Section ${positionOf(active.id)} déplacée en position ${positionOf(over.id)}.`;
			}
			return `Section ${positionOf(active.id)} n'est plus au-dessus d'une zone de dépôt.`;
		},
		onDragEnd({ active, over }) {
			if (over) {
				return `Section déposée en position ${positionOf(over.id)}.`;
			}
			return `Section ${positionOf(active.id)} déposée à sa position initiale.`;
		},
		onDragCancel({ active }) {
			return `Déplacement annulé. Section ${positionOf(active.id)} remise à sa position initiale.`;
		},
	};
}
