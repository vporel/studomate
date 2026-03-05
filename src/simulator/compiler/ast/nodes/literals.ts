import { BaseNode } from "./base-node";

export interface BooleanNode extends BaseNode { 
  type: "BOOLEAN_LITERAL";
  value: boolean 
};


export interface NumberNode extends BaseNode { 
  type: "NUMBER_LITERAL";
  value: number 
};

export interface StringNode extends BaseNode { 
  type: "STRING_LITERAL";
  value: string 
};

export type LiteralNode = BooleanNode | NumberNode | StringNode;