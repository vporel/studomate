"use client";

import { HmiStyleAnimation } from "@/schemas/hmi/hmi-widget.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

/**
 * Résout les propriétés de style animées d'un widget (voir `HmiStyleAnimation`) : cherche la ligne
 * dont la valeur correspond exactement à la valeur courante de la variable pilote (un booléen est
 * comparé comme `0`/`1`) et retourne ses propriétés. Objet vide si `enabled` est faux (page de
 * conception : le widget reste statique même si une simulation tourne), si l'animation est absente,
 * la variable introuvable, ou qu'aucune ligne ne correspond — l'appelant retombe alors sur les
 * valeurs statiques du widget.
 */
export default function useHmiStyleAnimation<TProps extends string>(
	animation: HmiStyleAnimation<TProps> | undefined,
	enabled: boolean,
): Partial<Record<TProps, string>> {
	const simulationVariablesStates = useProjectStore(
		(s) => s.simulationVariablesStates,
	);
	if (!enabled || !animation) return {};
	const entry = Object.values(simulationVariablesStates).find(
		(s) => s.mnemonic === animation.variableMnemonic,
	);
	if (!entry) return {};
	const currentValue =
		typeof entry.value === "boolean" ? (entry.value ? 1 : 0) : entry.value;
	const row = animation.rows.find((r) => r.value === currentValue);
	return row?.properties ?? {};
}
