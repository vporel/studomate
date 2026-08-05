import { createRandomId } from "@/simulator/utils/ids";
import { IdentifierNode } from "../nodes/identifiers";

export default class IdentifiersBuilder {
	static buildIdentifierNode(value: string, position?: number): IdentifierNode {
		return {
			id: createRandomId(),
			type: "IDENTIFIER",
			value,
			position,
		};
	}
}
