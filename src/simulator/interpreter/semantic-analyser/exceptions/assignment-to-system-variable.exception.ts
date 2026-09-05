import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import SemanticException from "./semantic.exception";

/**
 * Une variable système (`_SYS_*`, ex. les bases de temps `_SYS_TB_*`) est fournie en lecture
 * seule par le moteur : aucune routine ne peut lui affecter une valeur.
 */
export default class AssignmentToSystemVariableException extends SemanticException {
	constructor(originNode: AssignStatementNode) {
		super(
			`Invalid assignment: "${
				originNode.left.type === "IDENTIFIER" ? originNode.left.value : ""
			}" is a read-only system variable`,
			originNode,
			[originNode.left],
		);
	}
}
