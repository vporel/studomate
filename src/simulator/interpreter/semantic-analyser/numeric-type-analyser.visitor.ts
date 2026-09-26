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
	getNumberLiteralKind,
	NumberNode,
	StringNode,
} from "@/expression-language/ast/nodes/literals";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { foldNumberLiterals } from "@/expression-language/interpreter/numeric-literal-folding";
import { Environment } from "../environment/environment";
import {
	arithmeticResultType,
	numericTypeOfDeclaredType,
	TypedNumber,
} from "./numeric-typing";

const UNTYPED: TypedNumber = { type: "ANY_NUM" };

/**
 * IEC 61131-3 type of a numeric expression, and its value when it is a constant. Does not check
 * validity (the semantic analyser does): an operation with no valid type yields `ANY_NUM`. Non
 * numeric nodes also yield `ANY_NUM`, never used by callers.
 */
export default class NumericTypeAnalyserVisitor extends BaseVisitor<TypedNumber> {
	private env: Environment;

	constructor(environment: Environment) {
		super();
		this.env = environment;
	}

	protected visitIdentifierNode(node: IdentifierNode): TypedNumber {
		if (!this.env.existsVariableWithName(node.value)) return UNTYPED;
		return {
			type: numericTypeOfDeclaredType(
				this.env.getVariableDeclaredTypeByName(node.value),
			),
		};
	}

	protected visitBooleanNode(_node: BooleanNode): TypedNumber {
		return UNTYPED;
	}

	protected visitNumberNode(node: NumberNode): TypedNumber {
		switch (getNumberLiteralKind(node)) {
			case "integer":
				return { type: "ANY_INT", value: node.value };
			case "real":
				return { type: "ANY_REAL", value: node.value };
			case "time":
				return { type: "TIME", value: node.value };
		}
	}

	protected visitStringNode(_node: StringNode): TypedNumber {
		return UNTYPED;
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): TypedNumber {
		if (node.operator !== "-") return UNTYPED;
		const operand = this.visit(node.expr);
		return operand.value === undefined
			? { type: operand.type }
			: { type: operand.type, value: -operand.value };
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): TypedNumber {
		const left = this.visit(node.left);
		const right = this.visit(node.right);
		const type = arithmeticResultType(node.operator, left, right) ?? "ANY_NUM";
		if (
			left.value === undefined ||
			right.value === undefined ||
			(type !== "ANY_INT" && type !== "ANY_REAL")
		)
			return { type };
		const folded = foldNumberLiterals(
			node.operator,
			{ value: left.value, kind: left.type === "ANY_REAL" ? "real" : "integer" },
			{ value: right.value, kind: right.type === "ANY_REAL" ? "real" : "integer" },
		);
		return folded ? { type, value: folded.value } : { type };
	}

	protected visitComparisonExpressionNode(
		_node: ComparisonExpressionNode,
	): TypedNumber {
		return UNTYPED;
	}

	protected visitLogicalExpressionNode(_node: LogicalExpressionNode): TypedNumber {
		return UNTYPED;
	}

	protected visitConversionExpressionNode(
		node: ConversionExpressionNode,
	): TypedNumber {
		return { type: node.targetType };
	}

	protected visitAssignStatementNode(node: AssignStatementNode): TypedNumber {
		return this.visit(node.right);
	}

	protected visitIfControlNode(_node: IfControlNode): TypedNumber {
		return UNTYPED;
	}

	protected visitTimerBlockNode(_node: TimerNode): TypedNumber {
		return UNTYPED;
	}

	protected visitTimerStringDeclarationNode(
		_node: TimerStringDeclarationNode,
	): TypedNumber {
		return UNTYPED;
	}

	protected visitCounterBlockNode(_node: CounterNode): TypedNumber {
		return UNTYPED;
	}
}
