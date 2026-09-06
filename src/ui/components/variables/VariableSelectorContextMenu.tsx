"use client";

import Variable from "@/schemas/variable/variable.schema";
import { useT } from "@/ui/i18n/useT";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import { createPortal } from "react-dom";
import useGotoVariableDeclaration from "../projects/useGotoVariableDeclaration";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * Menu contextuel du `VariableSelector` (clic droit sur le champ). Rendu dans un portail sur
 * `document.body` avec le viewport pour cadre, pour rester correctement positionné et au-dessus
 * quel que soit le conteneur du champ (nœud de canvas, panneau de propriétés...).
 */
export default function VariableSelectorContextMenu({
	variable,
	position,
	onClose,
}: {
	variable: Variable;
	position: { x: number; y: number };
	onClose: () => void;
}) {
	const t = useT("variableSelectorMenu");
	const gotoDeclaration = useGotoVariableDeclaration();
	const setCrossReferenceResultVisible = useProjectStore(
		(s) => s.setCrossReferenceResultVisible,
	);
	const setCrossReferenceFilter = useProjectStore(
		(s) => s.setCrossReferenceFilter,
	);

	if (typeof document === "undefined") return null;

	return createPortal(
		<ContextMenu
			visible
			position={position}
			menuItems={[
				[
					{
						label: t("openDeclaration"),
						onClick: () => gotoDeclaration(variable),
					},
					{
						label: t("crossReferences"),
						onClick: () => {
							setCrossReferenceFilter(variable.mnemonic);
							setCrossReferenceResultVisible(true);
						},
					},
				],
			]}
			onClose={onClose}
			parentWidth={window.innerWidth}
			parentHeight={window.innerHeight}
		/>,
		document.body,
	);
}
