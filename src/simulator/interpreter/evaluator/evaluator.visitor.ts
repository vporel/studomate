import {
	CounterNode,
	TimerNode,
	TimerStringDeclarationNode,
} from "@/expression-language/ast/nodes/blocks";
import { IfControlNode } from "@/expression-language/ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	ConversionExpressionNode,
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
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { coerceToRange } from "@/lib/numeric-range";
import NumericTypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/numeric-type-analyser.visitor";
import {
	getNumericTypeRange,
	isIntegerType,
	NumericType,
} from "@/simulator/interpreter/semantic-analyser/numeric-typing";
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
	private numericTypeAnalyser: NumericTypeAnalyserVisitor;
	/** The type of a node depends only on the tree and on the declared types of the variables,
	 * both fixed for a compiled program: computed on first evaluation, then reused every cycle. */
	private readonly resultTypes = new WeakMap<ASTNode, NumericType>();

	constructor(environment: Environment, options: EvaluatorVisitorOptions) {
		super();
		this.env = environment;
		this.numericTypeAnalyser = new NumericTypeAnalyserVisitor(environment);
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
		this.numericTypeAnalyser = new NumericTypeAnalyserVisitor(environment);
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
				return this.toType(
					-(this.visit(node.expr) as number),
					this.resultTypeOf(node),
				);
		}
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): EnvVariableValue {
		const leftValue = this.visit(node.left) as number;
		const rightValue = this.visit(node.right) as number;
		const type = this.resultTypeOf(node);
		switch (node.operator) {
			case "+":
				return this.toType(leftValue + rightValue, type);
			case "-":
				return this.toType(leftValue - rightValue, type);
			case "*":
				return this.toType(leftValue * rightValue, type);
			case "/": {
				if (rightValue === 0) {
					throw new DivisionByZeroException(leftValue, rightValue, node);
				}
				const quotient = leftValue / rightValue;
				return this.toType(
					isIntegerType(type) ? Math.trunc(quotient) : quotient,
					type,
				);
			}
		}
	}

	protected visitConversionExpressionNode(
		node: ConversionExpressionNode,
	): EnvVariableValue {
		const value = this.visit(node.expr) as number;
		if (node.targetType === "REAL") return value;
		return this.toType(roundHalfToEven(value), node.targetType);
	}

	private resultTypeOf(node: ASTNode): NumericType {
		let type = this.resultTypes.get(node);
		if (type === undefined) {
			type = this.numericTypeAnalyser.visit(node).type;
			this.resultTypes.set(node, type);
		}
		return type;
	}

	/** An integer result wraps in its type's range, as on a PLC. */
	private toType(value: number, type: NumericType): number {
		const range = getNumericTypeRange(type);
		return range ? coerceToRange(value, range) : value;
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

/** Real to integer conversion: to the nearest integer, halfway cases to the even one. */
function roundHalfToEven(value: number): number {
	const rounded = Math.round(value);
	const isHalfway = Math.abs(value % 1) === 0.5;
	return isHalfway && rounded % 2 !== 0 ? rounded - 1 : rounded;
}
