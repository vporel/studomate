import { createRandomId } from "@/ids";
import { ASTNode } from "../nodes/ast-node";
import { CounterNode, CounterType, TimerNode, TimerStringDeclarationNode, TimerType } from "../nodes/blocks";

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
			id: createRandomId(),
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

	static buildCounterNode(
		counterType: CounterType,
		input: ASTNode,
		control: ASTNode,
		presetValue: ASTNode,
		currentValue: ASTNode,
		output: ASTNode,
		position?: number,
	): CounterNode {
		return {
			id: createRandomId(),
			type: "COUNTER_BLOCK",
			counterType,
			input,
			control,
			presetValue,
			currentValue,
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
			id: createRandomId(),
			type: "TIMER_STRING_DECLARATION",
			name,
			input,
			presetTime,
			position,
		};
	}
}
