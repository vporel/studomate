import { createRandomId } from "@/ids";
import Variable from "@/schemas/variable/variable.schema";
import { BlockPortSpec, structuralRailPorts } from "../block-port.schema";
import type { BlockElement, CounterBlockParams } from "../block.schema";
import type { GridPosition } from "../element.schema";
import {
	createBlockVariables,
	getBlockVariableMnemonics,
} from "./function-block.schema";

/** Les variantes de bloc compteur — CTU (compte vers le haut), CTD (compte vers le bas) et CTUD
 * (les deux). Contrairement au timer, leurs ports diffèrent (voir `getCounterPortSpecs`) : CTU a
 * `CU`/`R`, CTD a `CD`/`LD`, CTUD a `CU`/`CD`/`R`/`LD`. */
export const COUNTER_TYPES = ["CTU", "CTD", "CTUD"] as const;

export type CounterType = (typeof COUNTER_TYPES)[number];

const booleanInputParameter = (suffix: string): BlockPortSpec => ({
	suffix,
	type: "BOOL",
	kind: "parameter",
	direction: "input",
	generatesVariable: false,
	acceptedLiterals: ["boolean"],
});

/**
 * Les ports d'un bloc compteur, dans l'ordre pulsion/Q (structurels, câblés sur le rail) puis
 * contrôle/PV (paramètres, entrée) puis CV (paramètre, sortie). La pulsion de comptage s'appelle
 * `CU` pour CTU, `CD` pour CTD ; le port de contrôle `R` (remise à zéro) pour CTU, `LD` (charge
 * PV dans CV) pour CTD — ni l'un ni l'autre ne génère de variable, leur valeur est résolue
 * directement depuis la pinoche (nom de variable booléenne ou littéral booléen `TRUE`/`FALSE`).
 *
 * CTUD n'a qu'une entrée câblée sur le rail (`CU`, sortie `QU`) : `CD`, `R` et `LD` sont des
 * pinoches booléennes comme `R` d'un CTU, et `QD` une sortie paramètre comme `CV`.
 */
export function getCounterPortSpecs(counterType: CounterType): BlockPortSpec[] {
	const pulseSuffix = counterType === "CTD" ? "CD" : "CU";
	const outputSuffix = counterType === "CTUD" ? "QU" : "Q";
	const pulseAndOutput = structuralRailPorts(pulseSuffix, outputSuffix);
	const presetAndCurrent: BlockPortSpec[] = [
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
	if (counterType === "CTUD") {
		return [
			...pulseAndOutput,
			booleanInputParameter("CD"),
			booleanInputParameter("R"),
			booleanInputParameter("LD"),
			presetAndCurrent[0],
			{
				suffix: "QD",
				type: "BOOL",
				kind: "parameter",
				direction: "output",
				generatesVariable: true,
			},
			presetAndCurrent[1],
		];
	}
	return [
		...pulseAndOutput,
		booleanInputParameter(counterType === "CTU" ? "R" : "LD"),
		...presetAndCurrent,
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
	return createBlockVariables(elementId, name, getCounterPortSpecs(counterType));
}

/**
 * Lecture/écriture d'une pinoche paramètre d'un bloc compteur par son suffixe (`PV`/`CV`, ou le
 * port de contrôle `R`/`LD`, et `CD`/`QD` pour un CTUD) — consommé par `BLOCK_DEFINITIONS` pour piloter la grille de pinoches
 * générique de `BoxBlockNode`.
 */
export function readCounterParam(
	params: CounterBlockParams,
	suffix: string,
): string {
	if (suffix === "PV") return params.pv;
	if (suffix === "CV") return params.cv ?? "";
	if (params.counterType === "CTUD") {
		if (suffix === "CD") return params.down ?? "";
		if (suffix === "LD") return params.load ?? "";
		if (suffix === "QD") return params.qd ?? "";
	}
	return params.control;
}

export function writeCounterParam(
	params: CounterBlockParams,
	suffix: string,
	value: string,
): CounterBlockParams {
	if (suffix === "PV") return { ...params, pv: value };
	if (suffix === "CV") return { ...params, cv: value };
	if (params.counterType === "CTUD") {
		if (suffix === "CD") return { ...params, down: value };
		if (suffix === "LD") return { ...params, load: value };
		if (suffix === "QD") return { ...params, qd: value };
	}
	return { ...params, control: value };
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
