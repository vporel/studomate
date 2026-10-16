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
		firedVariables: new Map(
			transitions
				.filter(
					({ preCompiledTransition: t }) =>
						t.predecessorStepsIds.length > 0 && t.successorStepsIds.length > 0,
				)
				.map(({ id }) => [
					id,
					{
						variable: {} as any,
						node: IdentifiersBuilder.buildIdentifierNode(`_fired_${id}`),
					},
				]),
		),
	};
	const memos = new Map(
		Array.from(stepsMemos.entries()).map(([id, { node }]) => [id, node]),
	);
	return { preCompiledGrafcet, memos };
}

describe("TransitionCompiler", () => {
	describe("compile", () => {
		it("returns no nodes when transition has no predecessor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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

			expect(result).toEqual({ fired: null, deactivation: [], activation: [] });
		});

		it("returns no nodes when transition has no successor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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

			expect(result).toEqual({ fired: null, deactivation: [], activation: [] });
		});

		it("compiles a simple transition (one predecessor, one successor) as IF block", () => {
			const transitionNode = IdentifiersBuilder.buildIdentifierNode("I0");
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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

			expect(result.deactivation).toHaveLength(1);
			expect(result.activation).toHaveLength(1);
			expect(result.deactivation[0].type).toBe("IF_CONTROL");
			expect(result.activation[0].type).toBe("IF_CONTROL");
			// Fired variable := T AND memo(X0)
			const fired = result.fired as any;
			expect(fired.type).toBe("ASSIGN_STATEMENT");
			expect(fired.left.value).toBe("_fired_trans-1");
			expect(fired.right.type).toBe("LOGICAL_EXPRESSION");
			expect(fired.right.operator).toBe("AND");
		});

		it("uses step MEMOs in the activation condition (not live step values)", () => {
			const transitionNode = IdentifiersBuilder.buildIdentifierNode("I0");
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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
			const fired = result.fired as any;
			// Right operand of AND should reference the memo node (named _memo_X0), not X0 directly
			expect(fired.right.right.value).toBe("_memo_X0");
		});

		it("drops an always-true receptivity from the firing condition", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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

			expect((result.fired as any).right).toMatchObject({
				type: "IDENTIFIER",
				value: "_memo_X0",
			});
		});

		it("folds an always-false receptivity into a firing condition that is always false", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(false);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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

			expect((result.fired as any).right).toMatchObject({
				type: "BOOLEAN_LITERAL",
				value: false,
			});
		});

		it("deactivates all predecessor steps and activates all successor steps in the true branch", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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
			const deactivation = result.deactivation[0] as any;
			const activation = result.activation[0] as any;

			expect(deactivation.trueBranch).toHaveLength(1);
			expect(deactivation.trueBranch[0].left.value).toBe("X0");
			expect(deactivation.trueBranch[0].right.value).toBe(false);
			expect(activation.trueBranch).toHaveLength(1);
			expect(activation.trueBranch[0].left.value).toBe("X1");
			expect(activation.trueBranch[0].right.value).toBe(true);
			// Both blocks are guarded by the fired variable
			expect(deactivation.condition.value).toBe("_fired_trans-1");
			expect(activation.condition.value).toBe("_fired_trans-1");
		});

		it("AND convergence: checks all predecessor memos as part of the condition", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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
			const ifNode = result.deactivation[0] as any;
			const activation = result.activation[0] as any;

			// Fired variable := (T AND memo(X0)) AND memo(X1): chained AND
			const fired = result.fired as any;
			expect(fired.right.type).toBe("LOGICAL_EXPRESSION");
			expect(fired.right.operator).toBe("AND");
			// Deactivation block clears both predecessors, activation block sets the successor
			expect(ifNode.trueBranch).toHaveLength(2);
			const deactivated = ifNode.trueBranch.map((n: any) => n.left.value);
			expect(deactivated).toContain("X0");
			expect(deactivated).toContain("X1");
			expect(ifNode.trueBranch.every((n: any) => n.right.value === false)).toBe(
				true,
			);
			expect(ifNode.condition.value).toBe("_fired_trans-1");
			expect(activation.condition.value).toBe("_fired_trans-1");
			expect(activation.trueBranch).toHaveLength(1);
			expect(activation.trueBranch[0].left.value).toBe("X2");
			expect(activation.trueBranch[0].right.value).toBe(true);
		});

		it("AND divergence: activates all successor steps", () => {
			const transitionNode = LiteralsBuilder.buildBooleanNode(true);
			const preCompiledTransition: PreCompiledTransition = {
				node: transitionNode,
				pureNode: transitionNode,
				timers: [],
				timerElapsedVariables: [],
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
			const deactivation = result.deactivation[0] as any;
			const activation = result.activation[0] as any;

			expect(deactivation.trueBranch).toHaveLength(1);
			expect(deactivation.trueBranch[0].left.value).toBe("X0");
			expect(deactivation.trueBranch[0].right.value).toBe(false);
			expect(activation.trueBranch).toHaveLength(2);
			const activated = activation.trueBranch.map((n: any) => n.left.value);
			expect(activated).toContain("X1");
			expect(activated).toContain("X2");
			expect(activation.trueBranch.every((n: any) => n.right.value === true)).toBe(
				true,
			);
		});

		it("OR divergence: adds NOT(T_prior) to condition for lower-priority branch", () => {
			const trans1Node = IdentifiersBuilder.buildIdentifierNode("I1");
			const trans2Node = IdentifiersBuilder.buildIdentifierNode("I2");

			const preCompiledTrans1: PreCompiledTransition = {
				node: trans1Node,
				pureNode: trans1Node,
				timers: [],
				timerElapsedVariables: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			// trans-2 is lower priority: must exclude trans-1
			const preCompiledTrans2: PreCompiledTransition = {
				node: trans2Node,
				pureNode: trans2Node,
				timers: [],
				timerElapsedVariables: [],
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
			const fired1 = result1.fired as any;
			expect(fired1.right.operator).toBe("AND");

			// trans-2 condition: (T2 AND memo(X0)) AND NOT(T1)
			const fired2 = result2.fired as any;
			expect(fired2.right.type).toBe("LOGICAL_EXPRESSION");
			expect(fired2.right.operator).toBe("AND");
			// The rightmost operand should be NOT(trans1Node)
			expect(fired2.right.right.type).toBe("UNARY_EXPRESSION");
			expect(fired2.right.right.operator).toBe("NOT");
		});

		it("OR divergence: l'exclusion utilise le pureNode de la transition prioritaire (pas son TimerNode)", () => {
			// trans-1 : réceptivité temporisée — node = TimerNode, pureNode = lecture de la sortie
			const timerNode = { type: "TIMER_BLOCK", timerType: "TON" } as any;
			const timerOutputRead = IdentifiersBuilder.buildIdentifierNode("_timerOut");

			const preCompiledTrans1: PreCompiledTransition = {
				node: timerNode,
				pureNode: timerOutputRead,
				timers: [timerNode],
				timerElapsedVariables: [],
				predecessorStepsIds: ["step-0"],
				successorStepsIds: ["step-1"],
				orPriorityExclusionTransitionIds: [],
			};
			const preCompiledTrans2: PreCompiledTransition = {
				node: LiteralsBuilder.buildBooleanNode(true),
				pureNode: LiteralsBuilder.buildBooleanNode(true),
				timers: [],
				timerElapsedVariables: [],
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

			const fired2 = TransitionCompiler.compile(
				"trans-2",
				preCompiledTrans2,
				preCompiledGrafcet,
				memos,
			).fired as any;

			// NOT(...) enveloppe la lecture de la sortie de tempo, jamais le TIMER_BLOCK
			expect(fired2.right.right.operator).toBe("NOT");
			expect(fired2.right.right.expr).toBe(timerOutputRead);
		});
	});
});
