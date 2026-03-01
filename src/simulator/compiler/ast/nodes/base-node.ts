export interface BaseNode {
	/**
	 * Unique id of the node, used for referencing it in the tree
	 */
	id: string;
	type: string;
	position?: number;
}
