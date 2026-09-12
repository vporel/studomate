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
	const value = useProjectStore((s) =>
		animation
			? s.simulationVariablesStatesByMnemonic[animation.variable]?.value
			: undefined,
	);
	if (!enabled || !animation || value === undefined) return {};
	const currentValue = typeof value === "boolean" ? (value ? 1 : 0) : value;
	const row = animation.rows.find((r) => r.value === currentValue);
	return row?.properties ?? {};
}
