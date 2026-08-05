import { createRandomId } from "@/simulator/utils/ids";
import { ASTNode } from "../nodes/ast-node";
import { IfControlNode } from "../nodes/controls";

export default class ControlsBuilder {
	static buildIfControlNode(
		condition: ASTNode,
		trueBranch: ASTNode[],
		falseBranch: ASTNode[] | null,
		position?: number,
	): IfControlNode {
		return {
			id: createRandomId(),
			type: "IF_CONTROL",
			condition,
			trueBranch,
			falseBranch,
			position,
		};
	}
}
