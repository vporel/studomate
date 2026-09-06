"use client";

import { useT } from "@/ui/i18n/useT";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import EMPTY_ARRAY from "@/ui/lib/empty";
import { useProjectStore } from "../projects/ProjectContext";

/** Variable visée par un clic droit dans la table des variables. */
export type VariableRowMenuTarget = { variableId: string; mnemonic: string };

/**
 * Menu contextuel d'une ligne de la table des variables — réutilise le `ContextMenu` partagé
 * (comme l'explorateur). L'état (cible + position) est porté par `VariablesTable`, seule à capter
 * le clic droit d'une ligne de la grille.
 */
export default function VariableRowContextMenu({
	visible,
	target,
	position,
	onClose,
	parentWidth,
	parentHeight,
}: {
	visible: boolean;
	target: VariableRowMenuTarget | null;
	position: { x: number; y: number };
	onClose: () => void;
	parentWidth: number;
	parentHeight: number;
}) {
	const t = useT("pages.variablesGrid.contextMenu");
	const variablesManager = useProjectStore((s) => s.variablesManager);
	const setCrossReferenceResultVisible = useProjectStore(
		(s) => s.setCrossReferenceResultVisible,
	);
	const setCrossReferenceFilter = useProjectStore(
		(s) => s.setCrossReferenceFilter,
	);

	const menuItems = target
		? [
				[
					{
						label: t("crossReferences"),
						onClick: () => {
							setCrossReferenceFilter(target.mnemonic);
							setCrossReferenceResultVisible(true);
						},
					},
				],
				[
					{
						label: t("delete"),
						onClick: () =>
							variablesManager.removeVariables([target.variableId]),
					},
				],
			]
		: EMPTY_ARRAY;

	return (
		<ContextMenu
			visible={visible && target !== null}
			position={position}
			menuItems={menuItems}
			onClose={onClose}
			parentWidth={parentWidth}
			parentHeight={parentHeight}
		/>
	);
}
