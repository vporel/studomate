import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

/** Traducteur (namespace `ladderEditor.reorder`) passé aux annonces, pour qu'elles restent de
 * simples fonctions hors React. */
export type ReorderTranslate = (
	key: string,
	values?: Record<string, string | number>,
) => string;

export function ladderReorderScreenReaderInstructions(
	t: ReorderTranslate,
): ScreenReaderInstructions {
	return { draggable: t("instructions") };
}

/** Annonces vocales (région `aria-live` de dnd-kit) du réordonnancement des sections Ladder :
 * dnd-kit ne fournit que des annonces en anglais par défaut. Les sections n'ont pas de numéro
 * propre — leur position (1-based) sert de repère. */
export default function buildLadderReorderAnnouncements(
	sectionIdsInOrder: string[],
	t: ReorderTranslate,
): Announcements {
	const positionOf = (id: string | number) =>
		sectionIdsInOrder.indexOf(String(id)) + 1;

	return {
		onDragStart({ active }) {
			return t("grabbed", { position: positionOf(active.id) });
		},
		onDragOver({ active, over }) {
			if (over) {
				return t("moved", {
					position: positionOf(active.id),
					over: positionOf(over.id),
				});
			}
			return t("outside", { position: positionOf(active.id) });
		},
		onDragEnd({ active, over }) {
			if (over) {
				return t("dropped", { over: positionOf(over.id) });
			}
			return t("droppedInitial", { position: positionOf(active.id) });
		},
		onDragCancel({ active }) {
			return t("cancelled", { position: positionOf(active.id) });
		},
	};
}
