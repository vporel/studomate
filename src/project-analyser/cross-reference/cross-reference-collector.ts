import Project from "@/schemas/project/project.schema";
import collectGrafcetReferences from "./grafcet-references";
import collectHmiReferences from "./hmi-references";
import collectLadderReferences from "./ladder-references";
import { CrossReference, Reference } from "./cross-reference.types";

/**
 * Construit la table des références croisées d'un projet : pour chaque variable, tous les
 * endroits qui la lisent ou l'écrivent (ladder + grafcet), avec de quoi y naviguer.
 *
 * Ne passe **pas** par la sortie compilée (elle perd les ids d'éléments source) et ne lève
 * jamais — une expression invalide ne produit simplement aucune référence. Coût par action
 * utilisateur explicite : recalculé à chaque ouverture du panneau, sans cache (cf. CLAUDE.md).
 *
 * Couvre ladder, grafcet et pages HMI (liaisons et animations de widgets).
 *
 * Périmètre : uniquement les variables visibles dans la table des variables — `project.variables`,
 * variables exposées de blocs (`<Nom>.Q`…) et variables système `_SYS_*` si référencées ; jamais
 * les mémoires cachées `EDGE_*` / `BLOCK_<id>_<port>`, qui ne transitent pas par le schéma.
 */
export default class CrossReferenceCollector {
	static collect(project: Project): CrossReference[] {
		const dialect = project.dialect;
		const raw = [
			...Object.values(project.ladders).flatMap((ladder) =>
				collectLadderReferences(ladder, dialect),
			),
			...Object.values(project.grafcets).flatMap((grafcet) =>
				collectGrafcetReferences(grafcet, dialect),
			),
			...Object.values(project.hmiPages).flatMap((page) =>
				collectHmiReferences(page),
			),
		];

		const referencesByName = new Map<string, Reference[]>();
		for (const { variableName, ...reference } of raw) {
			const bucket = referencesByName.get(variableName);
			if (bucket) bucket.push(reference);
			else referencesByName.set(variableName, [reference]);
		}

		return [...referencesByName.entries()]
			.map(([variableName, references]) => ({ variableName, references }))
			.sort((a, b) => a.variableName.localeCompare(b.variableName));
	}
}
