import { BooleanNode, NumberNode, StringNode } from "../nodes/literals";

export default class LiteralsBuilder {
  static buildBooleanNode(value: boolean, position?: number): BooleanNode {
    return {
      type: "BOOLEAN_LITERAL",
      value,
      position
    };
  }

  static buildNumberNode(value: number, position?: number): NumberNode {
    return {
      type: "NUMBER_LITERAL",
      value,
      position
    };
  }

  static buildStringNode(value: string, position?: number): StringNode {
    return {
      type: "STRING_LITERAL",
      value,
      position
    };
  }
}
