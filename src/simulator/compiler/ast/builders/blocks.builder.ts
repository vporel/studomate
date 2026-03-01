import { ASTNode } from "../nodes/ast-node";
import { TimerNode, TimerStringDeclarationNode, TimerType } from "../nodes/blocks";

export default class BlocksBuilder {
	static buildTimerNode(
		timerType: TimerType,
		input: ASTNode,
		lastInput: ASTNode,
		presetTime: ASTNode,
		elapsedTime: ASTNode,
		output: ASTNode,
		position?: number,
	): TimerNode {
		return {
			type: "TIMER_BLOCK",
			timerType,
			input,
			lastInput,
			presetTime,
			elapsedTime,
			output,
			position,
		};
	}

	static buildTimerStringDeclarationNode(
		name: string,
		input: ASTNode,
		presetTime: number,
		position?: number,
	): TimerStringDeclarationNode {
		return {
			type: "TIMER_STRING_DECLARATION",
			name,
			input,
			presetTime,
			position,
		};
	}
}
