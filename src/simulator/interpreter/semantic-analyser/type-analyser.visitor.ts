import {
	CounterNode,
	TimerNode,
	TimerStringDeclarationNode,
} from "@/expression-language/ast/nodes/blocks";
import { IfControlNode } from "@/expression-language/ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "@/expression-language/ast/nodes/expressions";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import {
	BooleanNode,
	NumberNode,
	StringNode,
} from "@/expression-language/ast/nodes/literals";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { Environment } from "../environment/environment";

/**
 * void for control nodes
 */
export type ExpectedNodeResultType = "number" | "boolean" | "string" | "void";

/**
 * Used to infer the type of an expression, it can be used in different contexts like :
 * If the environment is not set, the visitor could return "unknown" for nodes
 * that it can't infer the type of, instead of throwing an error.
 */
export default class TypeAnalyserVisitor extends BaseVisitor<
	ExpectedNodeResultType | "unknown"
> {
	private env?: Environment;

	constructor(environment?: Environment) {
		super();
		this.env = environment;
	}

	protected visitIdentifierNode(
		node: IdentifierNode,
	): ExpectedNodeResultType | "unknown" {
		return this.env?.getVariableTypeByName(node.value) ?? "unknown";
	}

	protected visitBooleanNode(_node: BooleanNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitNumberNode(_node: NumberNode): ExpectedNodeResultType {
		return "number";
	}

	protected visitStringNode(_node: StringNode): ExpectedNodeResultType {
		return "string";
	}

	protected visitUnaryExpressionNode(
		_node: UnaryExpressionNode,
	): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitArithmeticExpressionNode(
		_node: ArithmeticExpressionNode,
	): ExpectedNodeResultType {
		return "number";
	}

	protected visitComparisonExpressionNode(
		_node: ComparisonExpressionNode,
	): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitLogicalExpressionNode(
		_node: LogicalExpressionNode,
	): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitAssignStatementNode(
		node: AssignStatementNode,
	): ExpectedNodeResultType | "unknown" {
		return this.visit(node.right);
	}

	protected visitIfControlNode(_node: IfControlNode): ExpectedNodeResultType {
		return "void";
	}

	protected visitTimerBlockNode(_node: TimerNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitTimerStringDeclarationNode(
		_node: TimerStringDeclarationNode,
	): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitCounterBlockNode(_node: CounterNode): ExpectedNodeResultType {
		return "boolean";
	}
}
