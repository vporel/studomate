import { createRandomId } from "@/ids";
import type { BlockElement, TimerBlockParams } from "../block.schema";
import type { GridPosition } from "../element.schema";
import Variable from "@/schemas/variable/variable.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import {
	BlockPortSpec,
	requireConcreteType,
} from "../block-port.schema";
import { getBlockVariableMnemonics } from "./function-block.schema";

/** Les trois variantes de bloc timer — TON (retard à l'enclenchement), TOF (retard au
 * déclenchement), TP (impulsion calibrée). Chaque variante a son propre logigramme interne, mais
 * partage ports et mécanisme (voir `TIMER_PORT_SPECS`). */
export const TIMER_TYPES = ["TON", "TOF", "TP"] as const;

export type TimerType = (typeof TIMER_TYPES)[number];

/**
 * Les 4 ports d'un bloc timer, dans l'ordre IN/Q (structurels, câblés sur le rail) puis PT/ET
 * (paramètres, pinoches à champ texte). PT ne génère pas de variable : sa valeur est résolue
 * directement depuis la pinoche (constante `T#...` ou nom d'une variable existante) — voir
 * `BlockPortSpec.generatesVariable`.
 */
export const TIMER_PORT_SPECS: BlockPortSpec[] = [
	{
		suffix: "IN",
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
		suffix: "PT",
		type: "TIME",
		kind: "parameter",
		direction: "input",
		generatesVariable: false,
		acceptedLiterals: ["time"],
	},
	{
		suffix: "ET",
		type: "TIME",
		kind: "parameter",
		direction: "output",
		generatesVariable: true,
	},
];

/** Les mnémoniques plats générés pour un bloc timer nommé `name` (`IN`, `Q`, `ET` — pas `PT`, voir
 * `TIMER_PORT_SPECS`). */
export function getTimerBlockVariableMnemonics(
	name: string,
): Record<string, string> {
	return getBlockVariableMnemonics(name, TIMER_PORT_SPECS);
}

/** La configuration d'un bloc timer vit directement dans `BlockElement.data.params` — cet
 * accesseur évite de répéter le rétrécissement de type partout où on doit la lire. */
export function getTimerBlockParams(
	element: BlockElement,
): TimerBlockParams | null {
	return element.data.blockType === "timer" ? element.data.params : null;
}

/** Les `Variable` exposées d'un bloc timer (IN/Q/ET — voir `TIMER_PORT_SPECS`), générées à
 * l'analyse à partir de ses éléments (voir `LadderAnalyser`), jamais persistées dans
 * `project.variables` : elles disparaissent avec le `BlockElement`, sans commande de cascade. */
export function createTimerBlockVariables(
	elementId: string,
	name: string,
): Variable[] {
	return TIMER_PORT_SPECS.filter((spec) => spec.generatesVariable).map((spec) =>
		new VariableBuilder()
			.id(`${elementId}-${spec.suffix}`)
			.mnemonic(`${name}.${spec.suffix}`)
			.zone("memory")
			.type(requireConcreteType(spec))
			.ownerBlock({ id: elementId })
			.build(),
	);
}

/**
 * Lecture/écriture d'une pinoche paramètre d'un bloc timer par son suffixe (`PT`/`ET`) —
 * consommé par `BLOCK_DEFINITIONS` pour piloter la grille de pinoches générique de `BoxBlockNode`.
 */
export function readTimerParam(params: TimerBlockParams, suffix: string): string {
	return suffix === "PT" ? params.pt : (params.et ?? "");
}

export function writeTimerParam(
	params: TimerBlockParams,
	suffix: string,
	value: string,
): TimerBlockParams {
	return suffix === "PT" ? { ...params, pt: value } : { ...params, et: value };
}

export function createTimerBlockElement(
	params: TimerBlockParams,
	row: number,
	col: number,
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "timer", params },
		position: { row, col } as GridPosition,
	};
}
