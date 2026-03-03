import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledStep } from "@/project-pre-compiler/pre-compilers/grafcet/step.pre-compiler";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
import StepCompiler from "./step.compiler";

describe("StepCompiler", () => {
	describe("compile", () => {
		it("compiles a step with a single branch (simple cycle)", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const previousStepNode = IdentifiersBuilder.buildIdentifierNode("X0");

			const preCompiledStep: PreCompiledStep = {
				node: stepNode,
				initial: false,
				branches: [
					{
						transitionId: "trans-1",
						stepsIdsBeforeTransition: ["step-0"],
					},
				],
				orDivergencePriorityExclusions: [],
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-0",
						{
							node: previousStepNode,
							initial: true,
							branches: [{ transitionId: "trans-1", stepsIdsBeforeTransition: ["step-1"] }],
							orDivergencePriorityExclusions: [],
						},
					],
					["step-1", preCompiledStep],
				]),
				stepsMemos: new Map(),
				transitions: new Map([["trans-1", { node: transitionNode, timers: [] }]]),
				actions: new Map(),
			};

			const result = StepCompiler.compile("step-1", preCompiledStep, preCompiledGrafcet, new Map());

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("IF_CONTROL");
			const ifNode = result[0] as any;
			expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode.condition.operator).toBe("AND");
		});

		it("deactivates predecessor steps when activating target step", () => {
			const stepNode = IdentifiersBuilder.buildIdentifierNode("X1");
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const step0Node = IdentifiersBuilder.buildIdentifierNode("X0");

			const preCompiledStep: PreCompiledStep = {
				node: stepNode,
				initial: false,
				branches: [{ transitionId: "trans-1", stepsIdsBeforeTransition: ["step-0"] }],
				orDivergencePriorityExclusions: [],
			};

			const preCompiledGrafcet: PreCompiledGrafcet = {
				steps: new Map([
					[
						"step-0",
						{
							node: step0Node,
							initial: true,
							branches: [{ transitionId: "trans-1", stepsIdsBeforeTransition: ["step-1"] }],
							orDivergencePriorityExclusions: [],
						},
					],
					["step-1", preCompiledStep],
				]),
				stepsMemos: new Map(),
				transitions: new Map([["trans-1", { node: transitionNode, timers: [] }]]),
				actions: new Map(),
			};

			const result = StepCompiler.compile("step-1", preCompiledStep, preCompiledGrafcet, new Map());

			const ifNode = result[0] as any;
			expect(ifNode.trueBranch[0].left.value).toBe("X0");
			expect(ifNode.trueBranch[0].right.value).toBe(false);
			expect(ifNode.trueBranch[1].left.value).toBe("X1");
			expect(ifNode.trueBranch[1].right.value).toBe(true);
		});
	});
});
