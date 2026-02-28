import { TimerNode } from "../ast/nodes/blocks";
import { IfControlNode } from "../ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../ast/nodes/expressions";
import { IdentifierNode } from "../ast/nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../ast/nodes/literals";
import { AssignStatementNode } from "../ast/nodes/statements";
import { BaseVisitor } from "../ast/visitors/base.visitor";
import { Environment } from "../environment/environment";
import IncompatibleOperandsTypesException from "./exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "./exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "./exceptions/invalid-assignment-target.exception";
import InvalidBinaryExprOperandTypeException from "./exceptions/invalid-binary-expr-operand-type.exception";
import InvalidControlConditionTypeException from "./exceptions/invalid-control-condition-type.exception";
import InvalidTimerElapsedTimeTypeException from "./exceptions/invalid-timer-elapsed-time-type.exception";
import InvalidTimerInputTypeException from "./exceptions/invalid-timer-input-type.exception";
import InvalidTimerLastInputNodeException from "./exceptions/invalid-timer-last-input-node.exception";
import InvalidTimerLastInputTypeException from "./exceptions/invalid-timer-last-input-type.exception";
import InvalidTimerOutputNodeException from "./exceptions/invalid-timer-output-node.exception";
import InvalidTimerOutputTypeException from "./exceptions/invalid-timer-output-type.exception";
import InvalidTimerPresetTimeTypeException from "./exceptions/invalid-timer-preset-time-type.exception";
import InvalidUnaryExprOperandTypeException from "./exceptions/invalid-unary-expr-operand-type.exception";
import UnknownIdentifierException from "./exceptions/unknown-identifier.exception";
import TypeAnalyserVisitor from "./type-analyser.visitor";

export default class SemanticAnalyserVisitor extends BaseVisitor<void> {
	private env: Environment;
	private typeAnalyser: TypeAnalyserVisitor;

	constructor(environment: Environment) {
		super();
		this.env = environment;
		this.typeAnalyser = new TypeAnalyserVisitor(environment);
	}

	protected visitIdentifierNode(node: IdentifierNode): void {
		if (!this.env.existsVariableWithName(node.value)) throw new UnknownIdentifierException(node);
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
				const operandType = this.typeAnalyser.visit(node.expr);
				if (operandType !== "boolean") {
					throw new InvalidUnaryExprOperandTypeException("NOT", "boolean", operandType, node);
				}
				this.visit(node.expr);
				break;
		}
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): void {
		// Check that both operands are numbers
		const leftOperandType = this.typeAnalyser.visit(node.left);
		const rightOperandType = this.typeAnalyser.visit(node.right);
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
		const leftType = this.typeAnalyser.visit(node.left);
		const rightType = this.typeAnalyser.visit(node.right);
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
		const leftType = this.typeAnalyser.visit(node.left);
		const rightType = this.typeAnalyser.visit(node.right);
		// Check that both operands are boolean
		if (leftType !== "boolean") {
			throw new InvalidBinaryExprOperandTypeException(node.operator, "left", "boolean", leftType, node);
		}
		if (rightType !== "boolean") {
			throw new InvalidBinaryExprOperandTypeException(
				node.operator,
				"right",
				"boolean",
				rightType,
				node,
			);
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
		const leftType = this.typeAnalyser.visit(node.left);
		const rightType = this.typeAnalyser.visit(node.right);
		// Check that the type of the right operand is compatible with the type of the variable being assigned to
		if (leftType !== rightType) {
			throw new IncompatibleOperandsTypesException(":=", leftType, rightType, node);
		}
		this.visit(node.left);
		this.visit(node.right);
	}

	protected visitIfControlNode(node: IfControlNode): void {
		const conditionType = this.typeAnalyser.visit(node.condition);
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

	protected visitTimerBlockNode(node: TimerNode): void {
		const inputType = this.typeAnalyser.visit(node.input);
		if (inputType !== "boolean") {
			throw new InvalidTimerInputTypeException(inputType, node);
		}
		if (node.lastInput.type !== "IDENTIFIER") {
			throw new InvalidTimerLastInputNodeException(node);
		}
		const lastInputType = this.typeAnalyser.visit(node.lastInput);
		if (lastInputType !== "boolean") {
			throw new InvalidTimerLastInputTypeException(lastInputType, node);
		}
		if (node.output.type !== "IDENTIFIER") {
			throw new InvalidTimerOutputNodeException(node);
		}
		const outputType = this.typeAnalyser.visit(node.output);
		if (outputType !== "boolean") {
			throw new InvalidTimerOutputTypeException(outputType, node);
		}
		const presetTimeType = this.typeAnalyser.visit(node.presetTime);
		if (presetTimeType !== "number") {
			throw new InvalidTimerPresetTimeTypeException(presetTimeType, node);
		}
		const elapsedTimeType = this.typeAnalyser.visit(node.elapsedTime);
		if (elapsedTimeType !== "number") {
			throw new InvalidTimerElapsedTimeTypeException(elapsedTimeType, node);
		}
	}
}
