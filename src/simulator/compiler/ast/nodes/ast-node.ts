import { ControlNode } from "./controls";
import { ExpressionNode } from "./expressions";
import { IdentifierNode } from "./identifiers";
import { LiteralNode } from "./literals";
import { StatementNode } from "./statements";

export type ASTNode = IdentifierNode | LiteralNode | ExpressionNode | StatementNode | ControlNode;
