import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";

/**
 * Ce que le niveau projet attend d'une notation pour compiler **tous** ses programmes en une
 * fois — pendant, côté compilation, de `ProgramAnalyser.crossProgramChecks` côté analyse.
 *
 * Toute la logique propre à une notation vit derrière cette couture : la compilation programme
 * par programme comme les artefacts au niveau projet (routine des mémos d'étape et routine
 * d'amorçage du GRAFCET, routine d'observation des réceptivités...). `ProjectCompiler` n'assemble
 * que des primitives moteur — registre de routines, listes plates de tempos/compteurs, ordre de
 * scan — sans rien connaître d'une notation en particulier.
 */
/**
 * Une variable observable rattachée à un élément propriétaire (ex. une transition GRAFCET).
 * `label: null` pour l'état booléen évalué de l'élément (surlignage) ; `label` porte un nom
 * (ex. le nom d'une tempo `t1`) pour une valeur nommée parmi plusieurs observables du même
 * propriétaire.
 */
export type ObservableVariableRef = {
	variableId: string;
	label: string | null;
};

export type NotationCompilationOutput = {
	/** Toutes les routines compilées de cette notation, indexées par id de programme — fusionnées
	 * dans le registre global qui résout les appels de sous-programme (`PLCRoutine.execute`). */
	routinesById: Record<string, PLCRoutine>;
	/**
	 * Routines scannées à chaque cycle, dans l'ordre, **avant** les points d'entrée des autres
	 * notations (pour le GRAFCET : les routines de chaque grafcet, puis la routine des mémos
	 * d'étape, puis la routine d'amorçage).
	 */
	scanRoutines: PLCRoutine[];
	/**
	 * Routines scannées **après** toutes les autres, tous notations confondues (pour le GRAFCET :
	 * la routine d'observation, qui lit l'état final des étapes et des sorties de tempo).
	 */
	trailingRoutines: PLCRoutine[];
	timers: TimerNode[];
	counters: CounterNode[];
	/**
	 * Id d'élément propriétaire (ex. transition GRAFCET) → variables observables qui lui sont
	 * rattachées (état booléen évalué, valeurs nommées type temps écoulé de tempo...). `{}` si
	 * la notation n'expose rien de tel.
	 */
	observableExpressionVariableIds: Record<string, ObservableVariableRef[]>;
};

export default interface NotationCompiler {
	compile(preCompiledProject: PreCompiledProject): NotationCompilationOutput;
}
