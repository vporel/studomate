"use client";

import {
	HmiPositionAnimation,
	HmiWidget,
} from "@/schemas/hmi/hmi-widget.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { resolvePositionAnimationOffset } from "./hmi-position-animation";

/**
 * Valeur brute (booléenne ou numérique) d'une variable de simulation résolue par mnémonique.
 * Le sélecteur renvoie une primitive : l'abonné ne se re-rend qu'au changement de cette valeur
 * précise, pas à chaque cycle où une autre variable bascule. `undefined` si le mnémonique est
 * vide/absent ou hors simulation.
 */
export function useHmiSimulationValue(
	mnemonic: string | undefined,
): boolean | number | undefined {
	return useProjectStore((s) =>
		mnemonic
			? s.simulationVariablesStatesByMnemonic[mnemonic]?.value
			: undefined,
	);
}

/**
 * Décalage de position courant d'un widget porté par son animation de position (voir
 * `HmiPositionAnimation`). Lit chaque variable pilote via `useHmiSimulationValue` pour ne
 * réveiller le widget que lorsqu'une de ses variables de position change. `undefined` hors
 * simulation ou si le widget ne porte aucune animation de position.
 */
export function useHmiPositionAnimationOffset(
	widget: HmiWidget,
	enabled: boolean,
): { dx: number; dy: number } | undefined {
	const position = (
		widget.data as { animations?: { position?: HmiPositionAnimation } }
	).animations?.position;
	const xValue = useHmiSimulationValue(position?.xVariable);
	const yValue = useHmiSimulationValue(position?.yVariable);
	if (!enabled) return undefined;
	return resolvePositionAnimationOffset(widget, (mnemonic) =>
		mnemonic === position?.xVariable
			? xValue
			: mnemonic === position?.yVariable
				? yValue
				: undefined,
	);
}
