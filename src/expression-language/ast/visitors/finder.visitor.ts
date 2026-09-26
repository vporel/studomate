import { ASTNode } from "../nodes/ast-node";
import AbstractCollectorVisitor from "./abstract-collector.visitor";

/**
 * This visitor is used to find all the nodes of a specified type in an AST
 */
export default class FinderVisitor<
	T extends ASTNode = ASTNode,
> extends AbstractCollectorVisitor<T> {
	private typeToFind: ASTNode["type"];

	constructor(typeToFind: ASTNode["type"]) {
		super();
		this.typeToFind = typeToFind;
	}

	protected matches(node: ASTNode): boolean {
		return node.type === this.typeToFind;
	}
}
