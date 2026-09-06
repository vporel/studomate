import { isSystemVariableName } from "@/schemas/variable/system-variables";
import Variable from "@/schemas/variable/variable.schema";
import { useCallback } from "react";
import { SYSTEM_VARIABLES_PAGE_DATA } from "../pages/SystemVariablesPage";
import {
	getVariablesPageData,
	getVariablesPageIdForZone,
} from "../pages/VariablesPage";
import { useProjectStore } from "./ProjectContext";

/**
 * Ouvre la table où une variable est déclarée et l'y met en évidence.
 *
 * Variable système (`_SYS_*`) : ouvre la page « Variables système » (lecture seule, sans
 * ciblage de ligne). Variable de projet : ouvre l'onglet de sa zone puis demande à
 * `VariablesTable` de faire défiler jusqu'à sa ligne et de la surligner (via `variableToReveal`).
 */
export default function useGotoVariableDeclaration() {
	const pagesManager = useProjectStore((s) => s.pagesManager);
	const setVariableToReveal = useProjectStore((s) => s.setVariableToReveal);

	return useCallback(
		(variable: Variable) => {
			if (isSystemVariableName(variable.mnemonic)) {
				pagesManager.openPage(SYSTEM_VARIABLES_PAGE_DATA);
				return;
			}
			pagesManager.openPage(
				getVariablesPageData(getVariablesPageIdForZone(variable.zone)),
			);
			setVariableToReveal(variable.id);
		},
		[pagesManager, setVariableToReveal],
	);
}
