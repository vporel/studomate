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

export type BlockNode = TimerNode;
