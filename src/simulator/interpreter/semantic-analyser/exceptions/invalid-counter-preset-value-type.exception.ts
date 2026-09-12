import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidCounterPresetValueTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: CounterNode) {
		super(
			`Invalid counter preset value type: the preset value (PV) of a counter must be a number`,
			"number",
			actualType,
			originNode,
			[originNode.presetValue],
		);
	}
}
