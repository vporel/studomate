import { createRandomId } from "@/simulator/utils/ids";
import { ASTNode } from "../nodes/ast-node";
import { AssignStatementNode } from "../nodes/statements";

export default class StatementsBuilder {
	static buildAssignStatementNode(left: ASTNode, right: ASTNode, position?: number): AssignStatementNode {
		return {
			id: createRandomId(),
			type: "ASSIGN_STATEMENT",
			left,
			right,
			position,
		};
	}
}
