import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import IncompatibleNumericTypesException from "./incompatible-numeric-types.exception";
import IncompatibleOperandsTypesException from "./incompatible-operands-types.exception";
import BinaryOperandsTypesException from "./binary-operands-types.exception";

const left = IdentifiersBuilder.buildIdentifierNode("a", 0);
const right = IdentifiersBuilder.buildIdentifierNode("b", 4);
const comparison = () =>
	ExpressionsBuilder.buildComparisonExpressionNode("=", left, right, 2);
const arithmetic = () =>
	ExpressionsBuilder.buildArithmeticExpressionNode("*", left, right, 2);

describe("IncompatibleNumericTypesException", () => {
	const node = arithmetic();
	const e = new IncompatibleNumericTypesException("*", "DINT", "REAL", node);

	it("expose l'opérateur et les types des opérandes", () => {
		expect(e.getOperator()).toBe("*");
		expect(e.getLeftType()).toBe("DINT");
		expect(e.getRightType()).toBe("REAL");
	});

	it("désigne le nœud d'origine et ses deux opérandes", () => {
		expect(e.getOriginNode()).toBe(node);
		expect(e.getInvalidNodes()).toEqual([left, right]);
	});

	it("conserve son message", () => {
		expect(e.message).toBe(
			"Operator '*' cannot combine DINT and REAL without an explicit conversion",
		);
	});
});

describe("IncompatibleOperandsTypesException", () => {
	const node = comparison();
	const e = new IncompatibleOperandsTypesException("=", "number", "string", node);

	it("expose l'opérateur et les types des opérandes", () => {
		expect(e.getOperator()).toBe("=");
		expect(e.getLeftType()).toBe("number");
		expect(e.getRightType()).toBe("string");
	});

	it("désigne le nœud d'origine et ses deux opérandes", () => {
		expect(e.getOriginNode()).toBe(node);
		expect(e.getInvalidNodes()).toEqual([left, right]);
	});

	it("conserve son message", () => {
		expect(e.message).toBe(
			"Incompatible operand types for operator '=': left operand is number, right operand is string",
		);
	});
});

describe("hiérarchie", () => {
	const numeric = new IncompatibleNumericTypesException(
		"*",
		"INT",
		"REAL",
		arithmetic(),
	);
	const operands = new IncompatibleOperandsTypesException(
		"=",
		"number",
		"string",
		comparison(),
	);

	it("partage la classe de base", () => {
		expect(numeric).toBeInstanceOf(BinaryOperandsTypesException);
		expect(operands).toBeInstanceOf(BinaryOperandsTypesException);
	});

	it("reste distinguable par instanceof", () => {
		expect(numeric).not.toBeInstanceOf(IncompatibleOperandsTypesException);
		expect(operands).not.toBeInstanceOf(IncompatibleNumericTypesException);
	});
});
