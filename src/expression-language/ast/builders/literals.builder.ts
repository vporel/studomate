import { createRandomId } from "@/ids";
import { BooleanNode, NumberNode, StringNode } from "../nodes/literals";

export default class LiteralsBuilder {
	static buildBooleanNode(value: boolean, position?: number): BooleanNode {
		return {
			id: createRandomId(),
			type: "BOOLEAN_LITERAL",
			value,
			position,
		};
	}

	static buildNumberNode(value: number, position?: number): NumberNode {
		return {
			id: createRandomId(),
			type: "NUMBER_LITERAL",
			value,
			position,
		};
	}

	static buildStringNode(value: string, position?: number): StringNode {
		return {
			id: createRandomId(),
			type: "STRING_LITERAL",
			value,
			position,
		};
	}
}
