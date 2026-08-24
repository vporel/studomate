"use client";

import { LadderRole } from "@/schemas/ladder/ladder.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useShallow } from "zustand/shallow";

/** `role` n'existe que pour un ladder — `undefined` pour un grafcet. */
export type ProjectProgram = { id: string; name: string; type: "grafcet" | "ladder"; role?: LadderRole };

const PROGRAM_TYPE_ORDER: Record<ProjectProgram["type"], number> = { ladder: 0, grafcet: 1 };

/** Le Main apparaît toujours avant les ladders standards, quel que soit son nom. */
const LADDER_ROLE_ORDER: Record<LadderRole, number> = { main: 0, standard: 1 };

/**
 * Retourne la liste fusionnée et triée des grafcets et ladders du projet.
 *
 * Utilise `useShallow` sur des sélecteurs à valeurs primitives (ids, noms) pour éviter
 * les re-rendus infinis : si le sélecteur retournait des objets reconstruits à chaque
 * appel, la comparaison superficielle de Zustand échouerait systématiquement.
 */
export default function useProjectPrograms(): ProjectProgram[] {
	const grafcetsIds = useProjectStore(
		useShallow((state) => (state.project ? Object.keys(state.project.grafcets) : [])),
	);
	const grafcetsNames = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(Object.values(state.project.grafcets).map((g) => [g.id, g.name]))
				: {},
		),
	);
	const laddersIds = useProjectStore(
		useShallow((state) => (state.project ? Object.keys(state.project.ladders) : [])),
	);
	const laddersNames = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(Object.values(state.project.ladders).map((l) => [l.id, l.name]))
				: {},
		),
	);
	const laddersRoles = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(Object.values(state.project.ladders).map((l) => [l.id, l.role]))
				: {},
		),
	);

	const programs: ProjectProgram[] = [
		...grafcetsIds.map((id) => ({ id, name: grafcetsNames[id], type: "grafcet" as const })),
		...laddersIds.map((id) => ({ id, name: laddersNames[id], type: "ladder" as const, role: laddersRoles[id] })),
	];

	return programs.sort((a, b) => {
		const typeOrder = PROGRAM_TYPE_ORDER[a.type] - PROGRAM_TYPE_ORDER[b.type];
		if (typeOrder !== 0) return typeOrder;
		const roleOrder = LADDER_ROLE_ORDER[a.role ?? "standard"] - LADDER_ROLE_ORDER[b.role ?? "standard"];
		if (roleOrder !== 0) return roleOrder;
		return a.name.localeCompare(b.name);
	});
}
