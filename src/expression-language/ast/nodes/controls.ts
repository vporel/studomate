import { ASTNode } from "./ast-node";
import { BaseNode } from "./base-node";

export interface IfControlNode extends BaseNode {
	type: "IF_CONTROL";
	condition: ASTNode;
	trueBranch: ASTNode[];
	falseBranch: ASTNode[] | null;
}

export type ControlNode = IfControlNode;
