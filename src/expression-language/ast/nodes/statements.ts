import { ASTNode } from "./ast-node";
import { BaseNode } from "./base-node";

export interface AssignStatementNode extends BaseNode {
	type: "ASSIGN_STATEMENT";
	left: ASTNode;
	right: ASTNode;
}

export type StatementNode = AssignStatementNode;
