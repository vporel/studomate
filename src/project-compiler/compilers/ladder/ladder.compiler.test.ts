import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { PreCompiledLadder } from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import LadderCompiler from "./ladder.compiler";

describe("LadderCompiler", () => {
	it("compile une bobine normal en une simple affectation", () => {
		const condition = IdentifiersBuilder.buildIdentifierNode("A");
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "standard",
			assignments: [
				{
					kind: "coil",
					coilId: "c1",
					variable: "Q",
					mode: "normal",
					condition,
				},
			],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [],
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
			role: "standard",
			assignments: [
				{ kind: "coil", coilId: "c1", variable: "Q", mode: "set", condition },
			],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [],
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
			role: "standard",
			assignments: [
				{ kind: "coil", coilId: "c1", variable: "Q", mode: "reset", condition },
			],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [],
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
			role: "standard",
			assignments: [
				{
					kind: "coil",
					coilId: "c1",
					variable: "Q1",
					mode: "normal",
					condition: LiteralsBuilder.buildBooleanNode(true),
				},
				{
					kind: "coil",
					coilId: "c2",
					variable: "Q2",
					mode: "normal",
					condition: LiteralsBuilder.buildBooleanNode(true),
				},
			],
			edgeMemoUpdates: [
				{
					contactId: "e1",
					memoIdentifier: IdentifiersBuilder.buildIdentifierNode("EDGE_e1"),
					sourceIdentifier: IdentifiersBuilder.buildIdentifierNode("A"),
				},
			],
			blockCalls: [],
			timers: [],
			counters: [],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes.map((n) => n.type)).toEqual([
			"ASSIGN_STATEMENT",
			"ASSIGN_STATEMENT",
			"ASSIGN_STATEMENT",
		]);
		expect(nodes[2]).toMatchObject({
			left: { type: "IDENTIFIER", value: "EDGE_e1" },
			right: { type: "IDENTIFIER", value: "A" },
		});
	});

	it("ne produit jamais de timer", () => {
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "standard",
			assignments: [],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [],
		};

		const { timers } = LadderCompiler.compile(preCompiled);

		expect(timers).toEqual([]);
	});

	it("compile un port de bloc en une simple affectation", () => {
		const value = LiteralsBuilder.buildBooleanNode(true);
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "main",
			assignments: [
				{ kind: "blockPort", blockId: "b1", mnemonic: "b1_EN", value },
			],
			edgeMemoUpdates: [],
			blockCalls: [{ blockId: "b1", programId: "prog1", enMnemonic: "b1_EN" }],
			timers: [],
			counters: [],
		};

		const { nodes, calls } = LadderCompiler.compile(preCompiled);

		expect(nodes).toHaveLength(1);
		expect(nodes[0]).toMatchObject({
			type: "ASSIGN_STATEMENT",
			left: { type: "IDENTIFIER", value: "b1_EN" },
			right: { type: "BOOLEAN_LITERAL", value: true },
		});
		expect(calls).toMatchObject([
			{ programId: "prog1", condition: { type: "IDENTIFIER", value: "b1_EN" } },
		]);
	});

	it("embarque un TimerNode tel quel parmi les instructions, et le propage dans `timers`", () => {
		const timerNode = BlocksBuilder.buildTimerNode(
			"TON",
			IdentifiersBuilder.buildIdentifierNode("Tempo1.IN"),
			IdentifiersBuilder.buildIdentifierNode("lastIn"),
			LiteralsBuilder.buildNumberNode(5000),
			IdentifiersBuilder.buildIdentifierNode("Tempo1.ET"),
			IdentifiersBuilder.buildIdentifierNode("Tempo1.Q"),
		);
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "standard",
			assignments: [
				{
					kind: "embeddedNode",
					simRole: "timer",
					blockId: "b1",
					node: timerNode,
				},
			],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [timerNode],
			counters: [],
		};

		const { nodes, timers } = LadderCompiler.compile(preCompiled);

		expect(nodes).toEqual([timerNode]);
		expect(timers).toEqual([timerNode]);
	});

	it("embarque un CounterNode tel quel parmi les instructions, et le propage dans `counters`", () => {
		const counterNode = BlocksBuilder.buildCounterNode(
			"CTU",
			IdentifiersBuilder.buildIdentifierNode("Compteur1.IN"),
			IdentifiersBuilder.buildIdentifierNode("Compteur1.RLD"),
			LiteralsBuilder.buildNumberNode(10),
			IdentifiersBuilder.buildIdentifierNode("cv"),
			IdentifiersBuilder.buildIdentifierNode("Compteur1.Q"),
		);
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "standard",
			assignments: [
				{
					kind: "embeddedNode",
					simRole: "counter",
					blockId: "b1",
					node: counterNode,
				},
			],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [counterNode],
		};

		const { nodes, counters } = LadderCompiler.compile(preCompiled);

		expect(nodes).toEqual([counterNode]);
		expect(counters).toEqual([counterNode]);
	});

	it("embarque l'IfControlNode d'un bloc assign tel quel parmi les instructions", () => {
		const ifNode = ControlsBuilder.buildIfControlNode(
			IdentifiersBuilder.buildIdentifierNode("EN"),
			[
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("x"),
					LiteralsBuilder.buildNumberNode(1),
				),
			],
			null,
		);
		const preCompiled: PreCompiledLadder = {
			type: "ladder",
			role: "standard",
			assignments: [{ kind: "embeddedNode", blockId: "b1", node: ifNode }],
			edgeMemoUpdates: [],
			blockCalls: [],
			timers: [],
			counters: [],
		};

		const { nodes } = LadderCompiler.compile(preCompiled);

		expect(nodes).toEqual([ifNode]);
	});
});
