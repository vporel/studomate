import { useMemo } from "react";
import Project from "@/schemas/project/project.schema";
import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import { useT } from "@/ui/i18n/useT";

/**
 * Erreurs de validation du champ nom d'un bloc tempo/compteur — identique pour les deux familles
 * (seul un nom de bloc a cette contrainte, voir `validateBlockName`). En édition, le nom courant
 * du bloc occupe déjà cet emplacement dans l'espace de noms : ce n'est un conflit que s'il
 * coïncide avec une *autre* variable/bloc, d'où `initialName`.
 */
export function useBlockNameField(
	name: string,
	initialName: string | undefined,
	project: Project | null | undefined,
): string[] {
	const t = useT("ladderEditor.block");
	const tv = useT("variableValidation");
	return useMemo(() => {
		if (name === "") return [];
		if (name === initialName) return [];
		const errors = validateBlockName(name).map((i) =>
			tv(i.code as never, i.params as never),
		);
		if (errors.length === 0 && project?.isNameTaken(name)) {
			errors.push(t("nameTaken"));
		}
		return errors;
	}, [name, initialName, project, t, tv]);
}
