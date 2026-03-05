import { BaseNode } from "./base-node";

export interface IdentifierNode extends BaseNode {
	type: "IDENTIFIER";
	/**
	 * For a variable, this is the variable name. For a function call, this is the function name.
	 */
	value: string;
}
