import { createRandomId } from "@/ids";
import type { BlockElement, CounterBlockParams } from "../ladder/block.schema";
import type { GridPosition } from "../ladder/element.schema";
import Variable from "../variable/variable.schema";
import VariableBuilder from "../variable/builders/variable.builder";
import {
	BlockPortSpec,
	requireConcreteType,
} from "../ladder/block-port.schema";
import { getBlockVariableMnemonics } from "./function-block.schema";

/** Les deux variantes de bloc compteur — CTU (compte vers le haut) et CTD (compte vers le bas).
 * Contrairement au timer, leurs ports structurels diffèrent (voir `getCounterPortSpecs`) : CTU a
 * `IN`/`R`, CTD a `CD`/`LD`. */
export const COUNTER_TYPES = ["CTU", "CTD"] as const;

export type CounterType = (typeof COUNTER_TYPES)[number];

/**
 * Les ports d'un bloc compteur, dans l'ordre pulsion/Q (structurels, câblés sur le rail) puis
 * contrôle/PV (paramètres, entrée) puis CV (paramètre, sortie). La pulsion de comptage s'appelle
 * `IN` pour CTU, `CD` pour CTD ; le port de contrôle `R` (remise à zéro) pour CTU, `LD` (charge
 * PV dans CV) pour CTD — ni l'un ni l'autre ne génère de variable, leur valeur est résolue
 * directement depuis la pinoche (toujours une variable, jamais de littéral, contrairement à PV).
 */
export function getCounterPortSpecs(counterType: CounterType): BlockPortSpec[] {
	const pulseSuffix = counterType === "CTU" ? "IN" : "CD";
	const controlSuffix = counterType === "CTU" ? "R" : "LD";
	return [
		{
			suffix: pulseSuffix,
			type: "BOOL",
			kind: "structural",
			direction: "input",
			generatesVariable: true,
		},
		{
			suffix: "Q",
			type: "BOOL",
			kind: "structural",
			direction: "output",
			generatesVariable: true,
		},
		{
			suffix: controlSuffix,
			type: "BOOL",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		},
		{
			suffix: "PV",
			type: "INT",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
			acceptedLiterals: ["number"],
		},
		{
			suffix: "CV",
			type: "INT",
			kind: "parameter",
			direction: "output",
			generatesVariable: true,
		},
	];
}

/** Les mnémoniques plats générés pour un bloc compteur nommé `name` (pulsion/`Q`/`CV` — pas le
 * port de contrôle ni `PV`, voir `getCounterPortSpecs`). */
export function getCounterBlockVariableMnemonics(
	name: string,
	counterType: CounterType,
): Record<string, string> {
	return getBlockVariableMnemonics(name, getCounterPortSpecs(counterType));
}

/** La configuration d'un bloc compteur vit directement dans `BlockElement.data.params` — cet
 * accesseur évite de répéter le rétrécissement de type partout où on doit la lire. */
export function getCounterBlockParams(
	element: BlockElement,
): CounterBlockParams | null {
	return element.data.blockType === "counter" ? element.data.params : null;
}

/** Les `Variable` exposées d'un bloc compteur (pulsion/Q/CV — voir `getCounterPortSpecs`),
 * générées à l'analyse à partir de ses éléments (voir `LadderAnalyser`), jamais persistées dans
 * `project.variables` : elles disparaissent avec le `BlockElement`, sans commande de cascade. */
export function createCounterBlockVariables(
	elementId: string,
	name: string,
	counterType: CounterType,
): Variable[] {
	return getCounterPortSpecs(counterType)
		.filter((spec) => spec.generatesVariable)
		.map((spec) =>
			new VariableBuilder()
				.id(`${elementId}-${spec.suffix}`)
				.mnemonic(`${name}.${spec.suffix}`)
				.zone("memory")
				.type(requireConcreteType(spec))
				.ownerBlock({ id: elementId })
				.build(),
		);
}

export function createCounterBlockElement(
	params: CounterBlockParams,
	row: number,
	col: number,
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "counter", params },
		position: { row, col } as GridPosition,
	};
}
