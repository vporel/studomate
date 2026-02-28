import { ASTNode } from "../nodes/ast-node";
import { TimerNode, TimerType } from "../nodes/blocks";

export default class BlocksBuilder {
	static buildTimerNode(
		timerType: TimerType,
		input: ASTNode,
		presetTime: ASTNode,
		elapsedTime: ASTNode,
		output: ASTNode,
		position?: number,
	): TimerNode {
		return {
			type: "TIMER_BLOCK",
			timerType,
			input,
			presetTime,
			elapsedTime,
			output,
			position,
		};
	}
}
