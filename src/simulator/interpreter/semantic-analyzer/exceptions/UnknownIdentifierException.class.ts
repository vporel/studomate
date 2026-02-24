import { IdentifierNode } from "../../parser/AST";
import SemanticException from "./SemanticException.class";

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
