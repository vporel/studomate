import { PreCompiledAction } from "@/project-pre-compiler/pre-compilers/grafcet/action.pre-compiler";
import withFiredVariables from "@tests/utils/fired-variables";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import ActionCompiler from "./action.compiler";

describe("ActionCompiler", () => {
	describe("compile", () => {
		it("compiles action with onActivation phase", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");
			const assignNode = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M1"),
				LiteralsBuilder.buildBooleanNode(true),
			);

			const preCompiledAction: PreCompiledAction = {
				levelOutputs: [],
				phases: {
					onActivation: [assignNode],
					continuous: [],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet = withFiredVariables({
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
						},
					],
				]),
				stepsMemos: new Map([
					["step-1", { variable: {} as any, node: stepMemoNode }],
				]),
				transitions: new Map(),
				actions: new Map([["action-1", preCompiledAction]]),
			});

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("IF_CONTROL");
			const ifNode = result[0] as any;
			expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode.condition.operator).toBe("AND");
		});

		it("compiles only the falling-edge block for an onDeactivation-only action", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");
			const assignNode = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M1"),
				LiteralsBuilder.buildBooleanNode(true),
			);

			const preCompiledAction: PreCompiledAction = {
				levelOutputs: [],
				phases: {
					onActivation: [],
					continuous: [],
					onDeactivation: [assignNode],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet = withFiredVariables({
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
						},
					],
				]),
				stepsMemos: new Map([
					["step-1", { variable: {} as any, node: stepMemoNode }],
				]),
				transitions: new Map(),
				actions: new Map([["action-1", preCompiledAction]]),
			});

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("IF_CONTROL");
			const ifNode = result[0] as any;
			expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode.condition.left).toBe(stepMemoNode);
			expect(ifNode.condition.right.operator).toBe("NOT");
			expect(ifNode.trueBranch).toEqual([assignNode]);
		});

		it("compiles action with continuous phase", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");
			const assignNode = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M1"),
				LiteralsBuilder.buildBooleanNode(true),
			);

			const preCompiledAction: PreCompiledAction = {
				levelOutputs: [],
				phases: {
					onActivation: [],
					continuous: [assignNode],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet = withFiredVariables({
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
						},
					],
				]),
				stepsMemos: new Map(),
				transitions: new Map(),
				actions: new Map(),
			});

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(1);
			const continuousIfNode = result[0] as any;
			expect(continuousIfNode.condition.type).toBe("IDENTIFIER");
			expect(continuousIfNode.condition.value).toBe("X1");
		});

		it("compiles action with all three phases", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");
			const assignNode1 = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M1"),
				LiteralsBuilder.buildBooleanNode(true),
			);
			const assignNode2 = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M2"),
				LiteralsBuilder.buildBooleanNode(true),
			);
			const assignNode3 = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M3"),
				LiteralsBuilder.buildBooleanNode(true),
			);

			const preCompiledAction: PreCompiledAction = {
				levelOutputs: [],
				phases: {
					onActivation: [assignNode1],
					continuous: [assignNode2],
					onDeactivation: [assignNode3],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet = withFiredVariables({
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
						},
					],
				]),
				stepsMemos: new Map([
					["step-1", { variable: {} as any, node: stepMemoNode }],
				]),
				transitions: new Map(),
				actions: new Map([["action-1", preCompiledAction]]),
			});

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(3);
			expect(result[0].type).toBe("IF_CONTROL");
			expect(result[1].type).toBe("IF_CONTROL");
			expect(result[2].type).toBe("IF_CONTROL");
		});

		it("generates nothing for empty phases", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");

			const preCompiledAction: PreCompiledAction = {
				levelOutputs: [],
				phases: {
					onActivation: [],
					continuous: [],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet = withFiredVariables({
				type: "grafcet",
				transitionObservations: new Map(),
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
						},
					],
				]),
				stepsMemos: new Map(),
				transitions: new Map(),
				actions: new Map(),
			});

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toEqual([]);
		});
	});
});
