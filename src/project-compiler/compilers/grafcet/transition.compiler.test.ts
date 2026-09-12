import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledTransition } from "@/project-pre-compiler/pre-compilers/grafcet/transition.pre-compiler";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import TransitionCompiler from "./transition.compiler";

/** Helper: minimal PreCompiledGrafcet with the given steps (node only) and transitions */
function makeGrafcet(
	steps: Array<{ id: string; varName: string; initial?: boolean }>,
	transitions: Array<{
		id: string;
		preCompiledTransition: PreCompiledTransition;
	}>,
): { preCompiledGrafcet: PreCompiledGrafcet; memos: Map<string, any> } {
	const stepsMap = new Map(
		steps.map(({ id, varName, initial }) => [
			id,
			{
				node: IdentifiersBuilder.buildIdentifierNode(varName),
				initial: initial ?? false,
			},
		]),
	);
	const stepsMemos = new Map(
		steps.map(({ id, varName }) => [
			id,
			{
				variable: {} as any,
				node: IdentifiersBuilder.buildIdentifierNode(`_memo_${varName}`),
			},
		]),
	);
	const transitionsMap = new Map(
		transitions.map(({ id, preCompiledTransition }) => [
			id,
			preCompiledTransition,
		]),
	);
	const preCompiledGrafcet: PreCompiledGrafcet = {
		type: "grafcet",
		transitionObservations: new Map(),
		steps: stepsMap,
		stepsMemos,
		transitions: transitionsMap,
		actions: new Map(),
	};
	const memos = new Map(
		Array.from(stepsMemos.entries()).map(([id, { node }]) => [id, node]),
	);
	return { preCompiledGrafcet, memos };
}

describe("TransitionCompiler", () => {
	describe("compile", () => {
		it("returns empty array when transition has no predecessor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: [],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[{ id: "step-1", varName: "X1" }],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);

			expect(result).toHaveLength(0);
		});

		it("returns empty array when transition has no successor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: [],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[{ id: "step-0", varName: "X0", initial: true }],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);

			expect(result).toHaveLength(0);
		});

		it("compiles a simple transition (one predecessor, one successor) as IF block", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
				],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("IF_CONTROL");
			const ifNode = result[0] as any;
			// Condition: T AND memo(X0)
			expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode.condition.operator).toBe("AND");
		});

		it("uses step MEMOs in the activation condition (not live step values)", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
				],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);
			const ifNode = result[0] as any;
			// Right operand of AND should reference the memo node (named _memo_X0), not X0 directly
			expect(ifNode.condition.right.value).toBe("_memo_X0");
		});

		it("deactivates all predecessor steps and activates all successor steps in the true branch", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
				],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);
			const ifNode = result[0] as any;

			// True branch: [X0=false, X1=true]
			expect(ifNode.trueBranch).toHaveLength(2);
			expect(ifNode.trueBranch[0].left.value).toBe("X0");
			expect(ifNode.trueBranch[0].right.value).toBe(false);
			expect(ifNode.trueBranch[1].left.value).toBe("X1");
			expect(ifNode.trueBranch[1].right.value).toBe(true);
		});

		it("AND convergence: checks all predecessor memos as part of the condition", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0", "step-1"],
				successorStepsIds: ["step-2"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1", initial: true },
					{ id: "step-2", varName: "X2" },
				],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);
			const ifNode = result[0] as any;

			// Condition: (T AND memo(X0)) AND memo(X1)  — chained AND
			expect(ifNode.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode.condition.operator).toBe("AND");
			// True branch deactivates both predecessors, activates successor
			expect(ifNode.trueBranch).toHaveLength(3);
			const deactivated = [
				ifNode.trueBranch[0].left.value,
				ifNode.trueBranch[1].left.value,
			];
			expect(deactivated).toContain("X0");
			expect(deactivated).toContain("X1");
			expect(ifNode.trueBranch[2].left.value).toBe("X2");
			expect(ifNode.trueBranch[2].right.value).toBe(true);
		});

		it("AND divergence: activates all successor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1", "step-2"],
				orPriorityExclusionTransitionIds: [],
			};
			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
					{ id: "step-2", varName: "X2" },
				],
				[{ id: "trans-1", preCompiledTransition }],
			);

			const result = TransitionCompiler.compile(
				"trans-1",
				preCompiledTransition,
				preCompiledGrafcet,
				memos,
			);
			const ifNode = result[0] as any;

			// True branch: [X0=false, X1=true, X2=true]
			expect(ifNode.trueBranch).toHaveLength(3);
			expect(ifNode.trueBranch[0].right.value).toBe(false); // deactivate X0
			const activated = [
				ifNode.trueBranch[1].left.value,
				ifNode.trueBranch[2].left.value,
			];
			expect(activated).toContain("X1");
			expect(activated).toContain("X2");
		});

		it("OR divergence: adds NOT(T_prior) to condition for lower-priority branch", () => {
			const trans1Node = LiteralsBuilder.buildBooleanNode(true);
			const trans2Node = LiteralsBuilder.buildBooleanNode(false);

			const preCompiledTrans1: PreCompiledTransition = {
				node: trans1Node,
				pureNode: trans1Node,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			// trans-2 is lower priority: must exclude trans-1
			const preCompiledTrans2: PreCompiledTransition = {
				node: trans2Node,
				pureNode: trans2Node,
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-2"],
				orPriorityExclusionTransitionIds: ["trans-1"],
			};

			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
					{ id: "step-2", varName: "X2" },
				],
				[
					{ id: "trans-1", preCompiledTransition: preCompiledTrans1 },
					{ id: "trans-2", preCompiledTransition: preCompiledTrans2 },
				],
			);

			const result1 = TransitionCompiler.compile(
				"trans-1",
				preCompiledTrans1,
				preCompiledGrafcet,
				memos,
			);
			const result2 = TransitionCompiler.compile(
				"trans-2",
				preCompiledTrans2,
				preCompiledGrafcet,
				memos,
			);

			// trans-1 condition: T1 AND memo(X0) — no NOT
			const ifNode1 = result1[0] as any;
			expect(ifNode1.condition.operator).toBe("AND");

			// trans-2 condition: (T2 AND memo(X0)) AND NOT(T1)
			const ifNode2 = result2[0] as any;
			expect(ifNode2.condition.type).toBe("LOGICAL_EXPRESSION");
			expect(ifNode2.condition.operator).toBe("AND");
			// The rightmost operand should be NOT(trans1Node)
			expect(ifNode2.condition.right.type).toBe("UNARY_EXPRESSION");
			expect(ifNode2.condition.right.operator).toBe("NOT");
		});

		it("OR divergence: l'exclusion utilise le pureNode de la transition prioritaire (pas son TimerNode)", () => {
			// trans-1 : réceptivité temporisée — node = TimerNode, pureNode = lecture de la sortie
			const timerNode = { type: "TIMER_BLOCK", timerType: "TON" } as any;
			const timerOutputRead = IdentifiersBuilder.buildIdentifierNode("_timerOut");

			const preCompiledTrans1: PreCompiledTransition = {
				node: timerNode,
				pureNode: timerOutputRead,
				timers: [timerNode],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const preCompiledTrans2: PreCompiledTransition = {
				node: LiteralsBuilder.buildBooleanNode(true),
				pureNode: LiteralsBuilder.buildBooleanNode(true),
				timers: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-2"],
				orPriorityExclusionTransitionIds: ["trans-1"],
			};

			const { preCompiledGrafcet, memos } = makeGrafcet(
				[
					{ id: "step-0", varName: "X0", initial: true },
					{ id: "step-1", varName: "X1" },
					{ id: "step-2", varName: "X2" },
				],
				[
					{ id: "trans-1", preCompiledTransition: preCompiledTrans1 },
					{ id: "trans-2", preCompiledTransition: preCompiledTrans2 },
				],
			);

			const ifNode2 = TransitionCompiler.compile(
				"trans-2",
				preCompiledTrans2,
				preCompiledGrafcet,
				memos,
			)[0] as any;

			// NOT(...) enveloppe la lecture de la sortie de tempo, jamais le TIMER_BLOCK
			expect(ifNode2.condition.right.operator).toBe("NOT");
			expect(ifNode2.condition.right.expr).toBe(timerOutputRead);
		});
	});
});
