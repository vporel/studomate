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
import { EnvVariableValue } from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import EvaluatorException from "@/expression-language/interpreter/exceptions/evaluator.exception";
import CounterNodeEvaluator from "./counter-node.evaluator";
import TimerNodeEvaluator, {
	TimerNodeEvaluatorOptions,
} from "./timer-node.evaluator";

export type EvaluatorVisitorOptions = {
	timers: TimerNodeEvaluatorOptions;
};

export default class EvaluatorVisitor extends BaseVisitor<EnvVariableValue> {
	private env: Environment;
	private timerEvaluator: TimerNodeEvaluator;
	private counterEvaluator: CounterNodeEvaluator;
	private options: EvaluatorVisitorOptions;

	constructor(environment: Environment, options: EvaluatorVisitorOptions) {
		super();
		this.env = environment;
		this.timerEvaluator = new TimerNodeEvaluator(
			environment,
			this,
			options.timers,
		);
		this.counterEvaluator = new CounterNodeEvaluator(environment, this);
		this.options = options;
	}

	/** Rebranche l'évaluateur (et ses sous-évaluateurs) sur un autre environnement — permet à
	 * `PLCRoutine` de réutiliser la même instance de cycle en cycle plutôt que d'en recréer une. */
	setEnvironment(environment: Environment): void {
		this.env = environment;
		this.timerEvaluator.setEnvironment(environment);
		this.counterEvaluator.setEnvironment(environment);
	}

	setDeltaTimeMs(deltaTimeMs: number): void {
		this.options.timers.deltaTimeMs = deltaTimeMs;
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

	protected visitUnaryExpressionNode(
		node: UnaryExpressionNode,
	): EnvVariableValue {
		switch (node.operator) {
			case "NOT":
				return !this.visit(node.expr);
			case "-":
				return -(this.visit(node.expr) as number);
		}
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): EnvVariableValue {
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
					throw new DivisionByZeroException(leftValue, rightValue, node);
				}
				return leftValue / rightValue;
		}
	}

	protected visitComparisonExpressionNode(
		node: ComparisonExpressionNode,
	): EnvVariableValue {
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

	protected visitLogicalExpressionNode(
		node: LogicalExpressionNode,
	): EnvVariableValue {
		//Évaluation court-circuit : l'opérande droit n'est pas évalué si le gauche suffit à
		//trancher — une expression gardée (`b != 0 ET a / b > 1`) ne déclenche donc pas
		//l'exception de la branche protégée.
		switch (node.operator) {
			case "AND":
				return !!(this.visit(node.left) && this.visit(node.right));
			case "OR":
				return !!(this.visit(node.left) || this.visit(node.right));
		}
	}

	protected visitAssignStatementNode(
		node: AssignStatementNode,
	): EnvVariableValue {
		if (node.left.type !== "IDENTIFIER") {
			throw new EvaluatorException(
				"Left-hand side of assignment must be an identifier",
				node,
			);
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

	protected visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): EnvVariableValue {
		throw new EvaluatorException(
			"Timer string declaration nodes should not be evaluated directly",
			node,
		);
	}

	protected visitCounterBlockNode(node: CounterNode): EnvVariableValue {
		return this.counterEvaluator.evaluate(node);
	}
}
