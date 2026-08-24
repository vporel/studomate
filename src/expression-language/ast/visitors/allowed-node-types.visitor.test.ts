import ExpressionsBuilder from "../builders/expressions.builder";
import IdentifiersBuilder from "../builders/identifiers.builder";
import LiteralsBuilder from "../builders/literals.builder";
import StatementsBuilder from "../builders/statements.builder";
import AllowedNodeTypesVisitor from "./allowed-node-types.visitor";

describe("AllowedNodeTypesVisitor", () => {
	it("ne trouve aucune violation quand tous les nœuds sont autorisés", () => {
		const left = IdentifiersBuilder.buildIdentifierNode("A");
		const right = LiteralsBuilder.buildNumberNode(5);
		const expr = ExpressionsBuilder.buildComparisonExpressionNode(">", left, right);

		const visitor = new AllowedNodeTypesVisitor(["IDENTIFIER", "NUMBER_LITERAL", "COMPARISON_EXPRESSION"]);

		expect(visitor.visit(expr)).toEqual([]);
	});

	it("repère un nœud d'un type non autorisé, même imbriqué", () => {
		const a = IdentifiersBuilder.buildIdentifierNode("A");
		const b = IdentifiersBuilder.buildIdentifierNode("B");
		const logical = ExpressionsBuilder.buildLogicalExpressionNode("AND", a, b);
		const comparison = ExpressionsBuilder.buildComparisonExpressionNode(">", logical, LiteralsBuilder.buildNumberNode(0));

		const visitor = new AllowedNodeTypesVisitor(["IDENTIFIER", "NUMBER_LITERAL", "COMPARISON_EXPRESSION"]);
		const violations = visitor.visit(comparison);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toBe(logical);
	});

	it("repère une affectation comme violation", () => {
		const assign = StatementsBuilder.buildAssignStatementNode(
			IdentifiersBuilder.buildIdentifierNode("A"),
			IdentifiersBuilder.buildIdentifierNode("B"),
		);

		const visitor = new AllowedNodeTypesVisitor(["IDENTIFIER"]);
		const violations = visitor.visit(assign);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toBe(assign);
	});

	it("un nouveau type de nœud (ex. non listé) est rejeté par défaut, liste blanche", () => {
		const num = LiteralsBuilder.buildNumberNode(1);

		const visitor = new AllowedNodeTypesVisitor(["IDENTIFIER"]);
		const violations = visitor.visit(num);

		expect(violations).toEqual([num]);
	});
});
