import { IdentifierNode } from "../nodes/identifiers";

export default class IdentifiersBuilder {
  static buildIdentifierNode(value: string, position?: number): IdentifierNode {
    return {
      type: "IDENTIFIER",
      value,
      position
    };
  }
}
