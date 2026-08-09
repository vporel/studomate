import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { PreCompiledLadder } from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import LadderCompiler from "./ladder.compiler";

describe("LadderCompiler", () => {
	it("compile une bobine normal en une simple affectation", () => {
		const condition = IdentifiersBuilder.buildIdentifierNode("A");
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			coilAssignments: [{ coilId: "c1", variable: "Q", mode: "normal", condition }],
			edgeMemoUpdates: [],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe("ASSIGN_STATEMENT");
		expect(nodes[0]).toMatchObject({
			type: "ASSIGN_STATEMENT",
			left: { type: "IDENTIFIER", value: "Q" },
			right: { type: "IDENTIFIER", value: "A" },
		});
	});

	it("compile une bobine set en IF qui force la variable à true sans jamais la forcer à false", () => {
		const condition = IdentifiersBuilder.buildIdentifierNode("A");
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			coilAssignments: [{ coilId: "c1", variable: "Q", mode: "set", condition }],
			edgeMemoUpdates: [],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes).toHaveLength(1);
		expect(nodes[0]).toMatchObject({
			type: "IF_CONTROL",
			condition: { type: "IDENTIFIER", value: "A" },
			trueBranch: [
				{
					type: "ASSIGN_STATEMENT",
					left: { type: "IDENTIFIER", value: "Q" },
					right: { type: "BOOLEAN_LITERAL", value: true },
				},
			],
			falseBranch: null,
		});
	});

	it("compile une bobine reset en IF qui force la variable à false dans le then", () => {
		const condition = IdentifiersBuilder.buildIdentifierNode("A");
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			coilAssignments: [{ coilId: "c1", variable: "Q", mode: "reset", condition }],
			edgeMemoUpdates: [],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes[0]).toMatchObject({
			type: "IF_CONTROL",
			trueBranch: [
				{
					type: "ASSIGN_STATEMENT",
					left: { type: "IDENTIFIER", value: "Q" },
					right: { type: "BOOLEAN_LITERAL", value: false },
				},
			],
			falseBranch: null,
		});
	});

	it("place toutes les affectations de bobines avant toutes les mises à jour de mémoire de front", () => {
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			coilAssignments: [
				{ coilId: "c1", variable: "Q1", mode: "normal", condition: LiteralsBuilder.buildBooleanNode(true) },
				{ coilId: "c2", variable: "Q2", mode: "normal", condition: LiteralsBuilder.buildBooleanNode(true) },
			],
			edgeMemoUpdates: [
				{
					contactId: "e1",
					memoIdentifier: IdentifiersBuilder.buildIdentifierNode("EDGE_e1"),
					sourceIdentifier: IdentifiersBuilder.buildIdentifierNode("A"),
				},
			],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes.map((n) => n.type)).toEqual(["ASSIGN_STATEMENT", "ASSIGN_STATEMENT", "ASSIGN_STATEMENT"]);
		expect(nodes[2]).toMatchObject({
			left: { type: "IDENTIFIER", value: "EDGE_e1" },
			right: { type: "IDENTIFIER", value: "A" },
		});
	});

	it("ne produit jamais de timer", () => {
		const preCompiled: PreCompiledLadder = { type: "ladder", coilAssignments: [], edgeMemoUpdates: [] };

		const { timers } = LadderCompiler.compile(preCompiled);

		expect(timers).toEqual([]);
	});
});
