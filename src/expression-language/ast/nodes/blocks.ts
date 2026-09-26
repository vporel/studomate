import { ASTNode } from "./ast-node";
import { BaseNode } from "./base-node"; // Supposant que c'est ta classe parente

export type TimerType = "TON" | "TOF" | "TP";

export interface TimerNode extends BaseNode {
	type: "TIMER_BLOCK";
	timerType: TimerType;
	input: ASTNode; //should be of native type boolean
	lastInput: ASTNode; //should be an identifier node referencing a boolean variable (used to detect edges')
	presetTime: ASTNode; //in ms, should be of native type number
	elapsedTime: ASTNode; //in ms, should be of native type number
	output: ASTNode; //should be an identifier node referencing a boolean variable
}

/**
 * A simple timer declaration using a string format like t1/X10/5s
 * This node can not be directly evaluated, it's just a convenient way to declare timers with a simple syntax
 * It could be transformed into a TimerNode during an intermediate compilation step
 */
export interface TimerStringDeclarationNode extends BaseNode {
	type: "TIMER_STRING_DECLARATION";
	name: string;
	input: ASTNode; //should be of native type boolean
	presetTime: number; //in ms
}

export type CounterType = "CTU" | "CTD" | "CTUD";

/**
 * CTU (counts up, `input`/`control` = `CU`/`R`), CTD (counts down, `input`/`control` =
 * `CD`/`LD`) or CTUD (both, see `down`): the variants share the same node shape, only the counting
 * direction and the target of `control` differ (`CounterNodeEvaluator`). `input` counts on its rising edge
 * (detected through `lastInput`); `control` is evaluated on level: while true, it takes priority
 * over `input` and holds `currentValue` at its target value (`0` for CTU, `presetValue` for CTD).
 */
export interface CounterNode extends BaseNode {
	type: "COUNTER_BLOCK";
	counterType: CounterType;
	input: ASTNode; //should be of native type boolean
	lastInput: ASTNode; //should be an identifier node referencing a boolean variable (used to detect edges)
	control: ASTNode; //should be of native type boolean
	presetValue: ASTNode; //should be of native type number
	currentValue: ASTNode; //should be an identifier node referencing a numeric variable
	output: ASTNode; //should be an identifier node referencing a boolean variable
	/** CTUD only: the counting-down half (`CD`, its edge memory, `LD`, `QD`); `input`/`control`/`output` then carry `CU`/`R`/`QU`. */
	down?: CounterDownPart;
}

export interface CounterDownPart {
	input: ASTNode; //should be of native type boolean
	lastInput: ASTNode; //should be an identifier node referencing a boolean variable (used to detect edges)
	load: ASTNode; //should be of native type boolean
	output: ASTNode; //should be an identifier node referencing a boolean variable
}

export type BlockNode = TimerNode | TimerStringDeclarationNode | CounterNode;
