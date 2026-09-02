import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionOrStart, {
	JUNCTION_OR_START_HANDLE_BRANCH_TYPES,
} from "@/schemas/grafcet/junction-or-start.schema";
import Transition from "@/schemas/grafcet/transition.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class JunctionOrStartAnalyser extends GrafcetElementAnalyser<JunctionOrStart> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junctionOrStart: JunctionOrStart,
		_options: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		//Aucune règle isolée : la validité d'une jonction dépend entièrement de ses
		//connexions, donc de son contexte (voir analyseInContext).
		return [];
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		junctionOrStart: JunctionOrStart,
		grafcet: Grafcet,
		_environment: Environment,
		dialect: Dialect = Dialect.FR,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-junction-or-start" as const,
			sourceId: junctionOrStart.id,
		};

		if (!JunctionHelper.isPivotConnected(junctionOrStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_PIVOT_NOT_CONNECTED",
					source,
				),
			);
		}

		if (junctionOrStart.data.branchesOrder.length < 2) {
			issues.push(
				new ProjectAnalyserIssue("error", "JUNCTION_OR_MIN_BRANCHES", source),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionOrStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
				),
			);
			return issues;
		}

		// Toutes les branches sont connectées — vérifie qu'elles distribuent bien vers des
		// transitions, puis que les réceptivités atteintes sont mutuellement exclusives.
		const branchTransitions: Transition[] = [];
		for (const branchId of junctionOrStart.data.branchesOrder) {
			const conns = grafcet.getConnectionsByElementIdAndHandle(
				junctionOrStart.id,
				branchId,
			);
			if (conns.length === 0) continue; // safety guard, already covered above
			const target = conns[0].target;
			if (
				!JUNCTION_OR_START_HANDLE_BRANCH_TYPES.includes(
					target.type as "transition",
				)
			) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"JUNCTION_OR_START_BRANCH_NOT_TRANSITION",
						source,
					),
				);
				continue;
			}
			const transition = grafcet.getElementByIdAndType<Transition>(
				target.id,
				"transition",
			);
			if (transition) branchTransitions.push(transition);
		}

		issues.push(
			...JunctionOrStartAnalyser.checkExclusivity(
				branchTransitions,
				source,
				dialect,
			),
		);

		return issues;
	}

	/**
	 * Détecte les cas décidables statiquement de non-exclusivité entre les réceptivités des
	 * transitions atteintes par les branches d'une même divergence en OU : réceptivités
	 * identiques, ou l'une d'elles constante VRAI. Le `SimplifierVisitor` ne fait que du
	 * repliement de littéraux (pas de raisonnement algébrique du type « X OU NON X »), donc
	 * `ET(A, B)` ne peut se replier en VRAI que si A et B sont chacune déjà VRAI — cas déjà
	 * couvert individuellement, inutile de le tester en plus sur la conjonction.
	 */
	private static checkExclusivity(
		transitions: Transition[],
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const parsed = transitions
			.map((transition) => {
				const expression = transition.getFullExpression().trim();
				if (!expression) return null;
				try {
					return {
						transition,
						expression,
						node: parseExpressionCached(expression, dialect).ast,
					};
				} catch {
					return null; // Erreur de syntaxe déjà relevée par TransitionAnalyser
				}
			})
			.filter(
				(
					entry,
				): entry is {
					transition: Transition;
					expression: string;
					node: ASTNode;
				} => entry !== null,
			);

		const isConstantTrue = (node: ASTNode): boolean => {
			try {
				const simplified = new SimplifierVisitor().visit(node);
				return (
					simplified.type === "BOOLEAN_LITERAL" &&
					(simplified as { value: boolean }).value === true
				);
			} catch {
				return false;
			}
		};

		for (let i = 0; i < parsed.length; i++) {
			for (let j = i + 1; j < parsed.length; j++) {
				const a = parsed[i];
				const b = parsed[j];
				const notExclusive =
					a.expression === b.expression ||
					isConstantTrue(a.node) ||
					isConstantTrue(b.node);

				if (notExclusive) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"JUNCTION_OR_START_BRANCHES_NOT_EXCLUSIVE",
							source,
							{ expressionA: a.expression, expressionB: b.expression },
						),
					);
				}
			}
		}

		return issues;
	}
}
