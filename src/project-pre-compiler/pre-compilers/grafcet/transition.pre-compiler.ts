import MemoVariableGenerator from "@/project-pre-compiler/memo-variable.generator";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import {
	TimerNode,
	TimerStringDeclarationNode,
} from "@/expression-language/ast/nodes/blocks";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import ReplacerVisitor, {
	ReplacerVisitorReplacement,
} from "@/expression-language/ast/visitors/replacer.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import JunctionOrStartHelper from "@/schemas/grafcet/helpers/junction-or-start.helper";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import Transition from "@/schemas/grafcet/transition.schema";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";

export type PreCompiledTransition = {
	node: ASTNode;
	/**
	 * `node` où chaque `TimerNode` est remplacé par une lecture de sa variable de sortie —
	 * expression pure, sans effet de bord sur l'environnement. Les `TimerNode` bruts sont
	 * évalués une seule fois par cycle en tête de routine (voir `GrafcetCompiler`) ; toute
	 * lecture de la réceptivité (condition d'activation, exclusion de priorité d'une
	 * divergence OU, observation d'affichage) passe par `pureNode`. Identique à `node` en
	 * l'absence de tempo.
	 */
	pureNode: ASTNode;
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
		const { ast: parsed } = parseExpressionCached(
			transition.getFullExpression(),
			dialect,
		);
		//The semantic analysis should have already been done in the analyser, so we can skip it here and directly simplify the AST
		let node = new SimplifierVisitor().visit(parsed);
		const timersDeclarations = new FinderVisitor<TimerStringDeclarationNode>(
			"TIMER_STRING_DECLARATION",
		).visit(node);
		const timers = this.preCompileTimersFromDeclarations(
			timersDeclarations,
			variables,
		);
		const replacements: ReplacerVisitorReplacement[] = timersDeclarations.map(
			(decl, index) => ({
				predicate: (n) => n.id === decl.id,
				replacement: timers[index],
			}),
		);
		const replacer = new ReplacerVisitor(replacements);
		node = replacer.visit(node);

		const pureNode =
			timers.length > 0
				? new ReplacerVisitor(
						timers.map((timer) => ({
							predicate: (n: ASTNode) => n.id === timer.id,
							replacement: timer.output,
						})),
					).visit(node)
				: node;

		const predecessorStepsIds = TransitionHelper.getPredecessorSteps(
			transition.id,
			grafcet,
		).map((s) => s.id);
		const successorStepsIds = TransitionHelper.getSuccessorSteps(
			transition.id,
			grafcet,
		).map((s) => s.id);
		const orPriorityExclusionTransitionIds = this.computeOrPriorityExclusions(
			transition.id,
			grafcet,
		);

		return {
			node,
			pureNode,
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
	private static computeOrPriorityExclusions(
		transitionId: string,
		grafcet: Grafcet,
	): string[] {
		const exclusions: string[] = [];
		for (const junctionOrStart of Object.values(grafcet.junctionsOrStarts)) {
			const orderedTransitions =
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					junctionOrStart.id,
					grafcet,
				);
			const transitionIndex = orderedTransitions.findIndex(
				(t) => t?.id === transitionId,
			);
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
			const lastInputVariable = MemoVariableGenerator.generate(
				"boolean",
				takenVariablesNames,
			);
			takenVariablesNames.add(lastInputVariable.getName());
			const elapsedTimeVariable = MemoVariableGenerator.generate(
				"number",
				takenVariablesNames,
			);
			takenVariablesNames.add(elapsedTimeVariable.getName());
			const outputVariable = MemoVariableGenerator.generate(
				"boolean",
				takenVariablesNames,
			);
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
