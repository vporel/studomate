import { BaseNode } from "./base-node";

export interface IdentifierNode extends BaseNode { 
  type: "IDENTIFIER"; 
  value: string; 
};