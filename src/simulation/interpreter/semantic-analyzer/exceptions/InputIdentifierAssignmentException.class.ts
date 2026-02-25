import { AssignNode } from "../../parser/AST";
import SemanticException from "./SemanticException.class";

export default class InputIdentifierAssignmentException extends SemanticException {
	constructor(originNode: AssignNode) {
		super(`Invalid assignment: cannot assign a value to an input identifier`, originNode, [
			originNode.left,
		]);
	}
}
