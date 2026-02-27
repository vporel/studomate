import { ASTNode, PossibleNodeResultType } from "../ast/nodes/ast-node";
import { IfControlNode } from "../ast/nodes/controls";
import { UnaryExpressionNode, ArithmeticExpressionNode, ComparisonExpressionNode, LogicalExpressionNode } from "../ast/nodes/expressions";
import { IdentifierNode } from "../ast/nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../ast/nodes/literals";
import { AssignStatementNode } from "../ast/nodes/statements";
import { BaseVisitor } from "../ast/visitors/base.visitor";
import { Environment } from "../environment/environment";
import IncompatibleOperandsTypesException from "./exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "./exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "./exceptions/invalid-assignment-target.exception";
import InvalidControlConditionTypeException from "./exceptions/invalid-control-condition-type.exception";
import InvalidBinaryExprOperandTypeException from "./exceptions/invalid-binary-expr-operand-type.exception";
import UnknownIdentifierException from "./exceptions/unknown-identifier.exception";
import InvalidUnaryExprOperandTypeException from "./exceptions/invalid-unary-expr-operand-type.exception";


export default class SemanticAnalyserVisitor extends BaseVisitor<void> {

	private env: Environment;

	constructor(environment: Environment) {
		super();
		this.env = environment;
	}

	protected visitIdentifierNode(node: IdentifierNode): void {
		if (!this.env.existsVariableWithName(node.value)) 
			throw new UnknownIdentifierException(node);
	}

	protected visitBooleanNode(node: BooleanNode): void {
		// nothing to check for boolean literals
	}

	protected visitNumberNode(node: NumberNode): void {
		// nothing to check for number literals
	}

	protected visitStringNode(node: StringNode): void {
		// nothing to check for string literals
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): void {
		switch (node.operator) {
			case "NOT":
				const operandType = this.getNodePossibleResultType(node.expr);
				if (operandType !== "boolean") {
					throw new InvalidUnaryExprOperandTypeException("NOT", "boolean", operandType, node);
				}
				this.visit(node.expr);
				break;
		}
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): void {
		const leftType = this.getNodePossibleResultType(node.left);
		const rightType = this.getNodePossibleResultType(node.right);
		// Check that both operands are numbers
		const leftOperandType = this.getNodePossibleResultType(node.left);
		const rightOperandType = this.getNodePossibleResultType(node.right);
		if (leftOperandType !== "number") {
			throw new InvalidBinaryExprOperandTypeException(
				node.operator,
				"left",
				"number",
				leftOperandType,
				node,
			);
		}
		if (rightOperandType !== "number") {
			throw new InvalidBinaryExprOperandTypeException(
				node.operator,
				"right",
				"number",
				rightOperandType,
				node,
			);
		}
		this.visit(node.left);
		this.visit(node.right);
	}

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): void {
		const leftType = this.getNodePossibleResultType(node.left);
		const rightType = this.getNodePossibleResultType(node.right);
		if (leftType !== rightType) {
			throw new IncompatibleOperandsTypesException(node.operator, leftType, rightType, node);
		}
		if (node.operator !== "=" && node.operator !== "!=") {
			// For comparison operators other than equality and inequality, check that both operands are numbers
			if (leftType !== "number") {
				throw new InvalidBinaryExprOperandTypeException(
					node.operator,
					"left",
					"number",
					leftType,
					node,
				);
			}
			if (rightType !== "number") {
				throw new InvalidBinaryExprOperandTypeException(
					node.operator,
					"right",
					"number",
					rightType,
					node,
				);
			}
		}
		this.visit(node.left);
		this.visit(node.right);
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): void {
		const leftType = this.getNodePossibleResultType(node.left);
		const rightType = this.getNodePossibleResultType(node.right);
		// Check that both operands are boolean
		if (leftType !== "boolean") {
			throw new InvalidBinaryExprOperandTypeException(node.operator, "left", "boolean", leftType, node);
		}
		if (rightType !== "boolean") {
			throw new InvalidBinaryExprOperandTypeException(node.operator, "right", "boolean", rightType, node);
		}
		this.visit(node.left);
		this.visit(node.right);
	}

	protected visitAssignStatementNode(node: AssignStatementNode): void {
		if (node.left.type !== "IDENTIFIER") {
			throw new InvalidAssignmentTargetException(node);
		}
		const identifierDirection = this.env.getVariableDirectionByName(node.left.value);
		if (identifierDirection === "IN") {
			throw new InputIdentifierAssignmentException(node);
		}
		const leftType = this.getNodePossibleResultType(node.left);
		const rightType = this.getNodePossibleResultType(node.right);
		// Check that the type of the right operand is compatible with the type of the variable being assigned to
		if (leftType !== rightType) {
			throw new IncompatibleOperandsTypesException(":=", leftType, rightType, node);
		}
		this.visit(node.left);
		this.visit(node.right);
	}

	protected visitIfControlNode(node: IfControlNode): void {
		const conditionType = this.getNodePossibleResultType(node.condition);
		// Check that the condition of the if control is boolean
		if (conditionType !== "boolean") {
			throw new InvalidControlConditionTypeException(node);
		}
		this.visit(node.condition);
		node.trueBranch.forEach((stmt) => this.visit(stmt));
		if (node.falseBranch) {
			node.falseBranch.forEach((stmt) => this.visit(stmt));
		}
	}

	private getNodePossibleResultType(node: ASTNode): PossibleNodeResultType {
		switch (node.type) {
			case "IDENTIFIER":
				return this.env.getVariableTypeByName(node.value);
			case "BOOLEAN_LITERAL":
				return "boolean";
			case "NUMBER_LITERAL":
				return "number";
			case "STRING_LITERAL":
				return "string";
			case "UNARY_EXPRESSION":
				if (node.operator === "NOT") {
					return "boolean";
				}
				break;
			case "ARITHMETIC_EXPRESSION":
				return "number";
			case "COMPARISON_EXPRESSION":
				return "boolean";
			case "LOGICAL_EXPRESSION":
				return "boolean";
			case "ASSIGN_STATEMENT":
				// The type of an assignment expression is the type of the right-hand side
				return this.getNodePossibleResultType(node.right);
			case "IF_CONTROL":
				// The type of an if control is void, since it's a control structure and doesn't produce a value
				return "void";
			default:
				throw new Error(`Unknown node type: ${(node as any).type}`);
		}
		return "void"
	}
}
