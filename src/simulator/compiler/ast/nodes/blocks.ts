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

export type BlockNode = TimerNode | TimerStringDeclarationNode;
