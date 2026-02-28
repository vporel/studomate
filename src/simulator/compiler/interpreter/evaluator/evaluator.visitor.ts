import { TimerNode } from "../../ast/nodes/blocks";
import { IfControlNode } from "../../ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../../ast/nodes/expressions";
import { IdentifierNode } from "../../ast/nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../../ast/nodes/literals";
import { AssignStatementNode } from "../../ast/nodes/statements";
import { BaseVisitor } from "../../ast/visitors/base.visitor";
import { EnvVariableValue } from "../../environment/env-variable";
import { Environment } from "../../environment/environment";
import { DivisionByZeroException } from "./exceptions/division-by-zero.exception";
import EvaluatorException from "./exceptions/evaluator.exception";
import TimerEvaluator from "./timer.evaluator";

export default class EvaluatorVisitor extends BaseVisitor<EnvVariableValue> {
	private env: Environment;
	private timerEvaluator: TimerEvaluator;

	constructor(environment: Environment) {
		super();
		this.env = environment;
		this.timerEvaluator = new TimerEvaluator(environment, this);
	}

	protected visitIdentifierNode(node: IdentifierNode): EnvVariableValue {
		return this.env.getVariableValueByName(node.value);
	}

	protected visitBooleanNode(node: BooleanNode): EnvVariableValue {
		return node.value;
	}

	protected visitNumberNode(node: NumberNode): EnvVariableValue {
		return node.value;
	}

	protected visitStringNode(node: StringNode): EnvVariableValue {
		return node.value;
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): EnvVariableValue {
		switch (node.operator) {
			case "NOT":
				return !this.visit(node.expr);
		}
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): EnvVariableValue {
		const leftValue = this.visit(node.left) as number;
		const rightValue = this.visit(node.right) as number;
		switch (node.operator) {
			case "+":
				return leftValue + rightValue;
			case "-":
				return leftValue - rightValue;
			case "*":
				return leftValue * rightValue;
			case "/":
				if (rightValue === 0) {
					throw new DivisionByZeroException(leftValue, rightValue);
				}
				return leftValue / rightValue;
		}
	}

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): EnvVariableValue {
		const leftValue = this.visit(node.left) as number;
		const rightValue = this.visit(node.right) as number;
		switch (node.operator) {
			case "=":
				return leftValue === rightValue;
			case "!=":
				return leftValue !== rightValue;
			case "<":
				return leftValue < rightValue;
			case "<=":
				return leftValue <= rightValue;
			case ">":
				return leftValue > rightValue;
			case ">=":
				return leftValue >= rightValue;
		}
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): EnvVariableValue {
		const leftValue = this.visit(node.left) as boolean;
		const rightValue = this.visit(node.right) as boolean;
		switch (node.operator) {
			case "AND":
				//Use double negation to ensure the result is a boolean
				return !!(leftValue && rightValue);
			case "OR":
				//Use double negation to ensure the result is a boolean
				return !!(leftValue || rightValue);
		}
	}

	protected visitAssignStatementNode(node: AssignStatementNode): EnvVariableValue {
		if (node.left.type !== "IDENTIFIER") {
			throw new EvaluatorException("Left-hand side of assignment must be an identifier");
		}
		const value = this.visit(node.right);
		this.env.setVariableValueByName(node.left.value, value);
		return value;
	}

	protected visitIfControlNode(node: IfControlNode): EnvVariableValue {
		const conditionValue = this.visit(node.condition) as boolean;
		const branchToExecute = conditionValue ? node.trueBranch : node.falseBranch;
		if (!branchToExecute) return 0;
		let lastValue: EnvVariableValue = false;
		for (const statement of branchToExecute) {
			lastValue = this.visit(statement);
		}
		return lastValue;
	}

	protected visitTimerBlockNode(node: TimerNode): EnvVariableValue {
		return this.timerEvaluator.evaluate(node);
	}
}
