import { PreCompiledAction } from "@/project-pre-compiler/pre-compilers/grafcet/action.pre-compiler";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "@/simulator/compiler/ast/builders/statements.builder";
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
				phases: {
					onActivation: [assignNode],
					continuous: [],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
							branches: [{ transitionId: "t1", stepsIdsBeforeTransition: [] }],
						},
					],
				]),
				stepsMemos: new Map([["step-1", { variable: {} as any, node: stepMemoNode }]]),
				transitions: new Map(),
				actions: new Map([["action-1", preCompiledAction]]),
			};

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(3);
expect(result[0].type).toBe("IF_CONTROL");
const ifNode = result[0] as any;
expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
expect(ifNode.condition.operator).toBe("AND");
});

it("compiles action with continuous phase", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");
			const assignNode = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("M1"),
				LiteralsBuilder.buildBooleanNode(true),
			);

			const preCompiledAction: PreCompiledAction = {
				phases: {
					onActivation: [],
					continuous: [assignNode],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
							branches: [{ transitionId: "t1", stepsIdsBeforeTransition: [] }],
						},
					],
				]),
				stepsMemos: new Map(),
				transitions: new Map(),
				actions: new Map(),
			};

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			// Generates 3 IF controls: onActivation (empty), onDeactivation (empty), continuous (has body)
			expect(result).toHaveLength(3);
			const continuousIfNode = result[2] as any;
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
				phases: {
					onActivation: [assignNode1],
					continuous: [assignNode2],
					onDeactivation: [assignNode3],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
							branches: [{ transitionId: "t1", stepsIdsBeforeTransition: [] }],
						},
					],
				]),
				stepsMemos: new Map([["step-1", { variable: {} as any, node: stepMemoNode }]]),
				transitions: new Map(),
				actions: new Map([["action-1", preCompiledAction]]),
			};

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

		it("generates 3 IF controls even for empty phases", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const stepMemoNode = IdentifiersBuilder.buildIdentifierNode("_memo_1");

			const preCompiledAction: PreCompiledAction = {
				phases: {
					onActivation: [],
					continuous: [],
					onDeactivation: [],
				},
				stepId: "step-1",
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-1",
						{
							node: stepNode,
							initial: false,
							branches: [{ transitionId: "t1", stepsIdsBeforeTransition: [] }],
						},
					],
				]),
				stepsMemos: new Map(),
				transitions: new Map(),
				actions: new Map(),
			};

			const stepMemosNodes = new Map([["step-1", stepMemoNode]]);

			const result = ActionCompiler.compile(
				"action-1",
				preCompiledAction,
				preCompiledGrafcet,
				stepMemosNodes,
			);

			expect(result).toHaveLength(3);
		});
	});
});
