import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import BlocksBuilder from "@/simulator/compiler/ast/builders/blocks.builder";
import IdentifiersBuilder from "@/simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
import { TimerNode, TimerStringDeclarationNode } from "@/simulator/compiler/ast/nodes/blocks";
import FinderVisitor from "@/simulator/compiler/ast/visitors/finder.visitor";
import ReplacerVisitor, {
	ReplacerVisitorReplacement,
} from "@/simulator/compiler/ast/visitors/replacer.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import JunctionOrStartHelper from "../../../schemas/grafcet/helpers/junction-or-start.helper";
import TransitionHelper from "../../../schemas/grafcet/helpers/transition.helper";
import Transition from "../../../schemas/grafcet/transition.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";

export type PreCompiledTransition = {
	node: ASTNode;
	timers: TimerNode[];
	/**
	 * Ids of the steps that must be active (checked via memos) for this transition to fire,
	 * and that are deactivated when it does.
	 */
	predecessorStepsIds: string[];
	/**
	 * Ids of the steps that are activated when this transition fires.
	 */
	successorStepsIds: string[];
	/**
	 * Ids of higher-priority transitions in the same OR divergence.
	 * This transition can only fire if none of these transitions are simultaneously true
	 * (mutual exclusion by branch order, leftmost has priority).
	 */
	orPriorityExclusionTransitionIds: string[];
};

export default class TransitionPreCompiler {
	static preCompile(
		transition: Transition,
		grafcet: Grafcet,
		variables: PLCVariable[],
		dialect: Dialect,
	): PreCompiledTransition {
		const tokens = new Lexer(dialect).tokenize(transition.getFullExpression());
		const parsed = new Parser(tokens).parse();
		//The semantic analysis should have already been done in the analyser, so we can skip it here and directly simplify the AST
		let node = new SimplifierVisitor().visit(parsed);
		const timersDeclarations = new FinderVisitor<TimerStringDeclarationNode>(
			"TIMER_STRING_DECLARATION",
		).visit(node);
		const timers = this.preCompileTimersFromDeclarations(timersDeclarations, variables);
		const replacements: ReplacerVisitorReplacement[] = timersDeclarations.map((decl, index) => ({
			predicate: (n) => n.id === decl.id,
			replacement: timers[index],
		}));
		const replacer = new ReplacerVisitor(replacements);
		node = replacer.visit(node);

		const predecessorStepsIds = TransitionHelper.getPredecessorSteps(transition.id, grafcet).map(
			(s) => s.id,
		);
		const successorStepsIds = TransitionHelper.getSuccessorSteps(transition.id, grafcet).map(
			(s) => s.id,
		);
		const orPriorityExclusionTransitionIds = this.computeOrPriorityExclusions(
			transition.id,
			grafcet,
		);

		return {
			node,
			timers,
			predecessorStepsIds,
			successorStepsIds,
			orPriorityExclusionTransitionIds,
		};
	}

	/**
	 * For OR divergences, finds the higher-priority transition ids for the given transition.
	 * Uses the branch order from JunctionOrStart: leftmost branch (index 0) has highest priority.
	 * A transition at index i must NOT fire if any transition at index < i is simultaneously true.
	 */
	private static computeOrPriorityExclusions(transitionId: string, grafcet: Grafcet): string[] {
		const exclusions: string[] = [];
		for (const junctionOrStart of grafcet.junctionsOrStarts) {
			const orderedTransitions = JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
				junctionOrStart.id,
				grafcet,
			);
			const transitionIndex = orderedTransitions.findIndex((t) => t?.id === transitionId);
			if (transitionIndex <= 0) continue; // not in this divergence, or already first (no exclusions)
			const priorIds = orderedTransitions
				.slice(0, transitionIndex)
				.filter((t) => t !== null)
				.map((t) => t!.id);
			exclusions.push(...priorIds);
		}
		return exclusions;
	}

	private static preCompileTimersFromDeclarations(
		declarations: TimerStringDeclarationNode[],
		variables: PLCVariable[],
	): TimerNode[] {
		const timers: TimerNode[] = [];
		const takenVariablesNames = new Set(variables.map((v) => v.getName()));
		for (const decl of declarations) {
			const lastInputVariable = MemoVariableGenerator.generate("boolean", takenVariablesNames);
			takenVariablesNames.add(lastInputVariable.getName());
			const elapsedTimeVariable = MemoVariableGenerator.generate("number", takenVariablesNames);
			takenVariablesNames.add(elapsedTimeVariable.getName());
			const outputVariable = MemoVariableGenerator.generate("boolean", takenVariablesNames);
			takenVariablesNames.add(outputVariable.getName());
			variables.push(lastInputVariable, elapsedTimeVariable, outputVariable);
			timers.push(
				BlocksBuilder.buildTimerNode(
					"TON",
					decl.input,
					IdentifiersBuilder.buildIdentifierNode(lastInputVariable.getName()),
					LiteralsBuilder.buildNumberNode(decl.presetTime),
					IdentifiersBuilder.buildIdentifierNode(elapsedTimeVariable.getName()),
					IdentifiersBuilder.buildIdentifierNode(outputVariable.getName()),
				),
			);
		}
		return timers;
	}
}
