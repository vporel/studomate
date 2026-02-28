import { TimerNode } from "../../ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidTimerPresetTimeTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: TimerNode) {
		super(
			`Invalid timer preset time type: the preset time of a timer block must be a number`,
			"number",
			actualType,
			originNode,
			[originNode.presetTime],
		);
	}
}
