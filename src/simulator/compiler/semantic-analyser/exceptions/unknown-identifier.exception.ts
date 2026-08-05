import { IdentifierNode } from "@/simulator/compiler/ast/nodes/identifiers";
import SemanticException from "./semantic.exception";

export default class UnknownIdentifierException extends SemanticException {
	private readonly identifier: string;

	constructor(originNode: IdentifierNode) {
		super(`Unknown identifier: ${originNode.value}`, originNode, [originNode]);
		this.identifier = originNode.value;
	}

	getIdentifier(): string {
		return this.identifier;
	}
}
