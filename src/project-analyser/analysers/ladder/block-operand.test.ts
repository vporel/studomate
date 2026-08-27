import { Dialect } from "@/expression-language/dialect.enum";
import {
	OPERAND_NODE_TYPES,
	parseIdentifierNode,
	parseOperandNode,
} from "./block-operand";

describe("parseOperandNode", () => {
	it("accepte un identifiant ou un littéral", () => {
		expect(
			parseOperandNode("count", Dialect.FR, OPERAND_NODE_TYPES)?.type,
		).toBe("IDENTIFIER");
		expect(parseOperandNode("42", Dialect.FR, OPERAND_NODE_TYPES)?.type).toBe(
			"NUMBER_LITERAL",
		);
		expect(
			parseOperandNode("vrai", Dialect.FR, OPERAND_NODE_TYPES)?.type,
		).toBe("BOOLEAN_LITERAL");
	});

	it("refuse une expression composée", () => {
		expect(
			parseOperandNode("count + 1", Dialect.FR, OPERAND_NODE_TYPES),
		).toBeNull();
		expect(
			parseOperandNode("a > b", Dialect.FR, OPERAND_NODE_TYPES),
		).toBeNull();
	});

	it("lève sur une syntaxe invalide", () => {
		expect(() =>
			parseOperandNode("a +", Dialect.FR, OPERAND_NODE_TYPES),
		).toThrow();
	});
});

describe("parseIdentifierNode", () => {
	it("renvoie le nœud pour un simple mnémonique, null sinon", () => {
		expect(parseIdentifierNode("out", Dialect.FR)?.type).toBe("IDENTIFIER");
		expect(parseIdentifierNode("42", Dialect.FR)).toBeNull();
		expect(parseIdentifierNode("a + b", Dialect.FR)).toBeNull();
	});
});
