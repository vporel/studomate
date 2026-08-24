import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import SchemaVariablesMapper from "@/bridge/variables.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import AllowedNodeTypesVisitor from "@/expression-language/ast/visitors/allowed-node-types.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import TypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/type-analyser.visitor";

/** Seuls ces types de nœud sont autorisés dans l'expression d'un bloc compare — opérateurs
 * arithmétiques et de comparaison, identifiants et littéraux ; jamais l'affectation, un opérateur
 * logique (ET/OU/NON), ou un bloc timer/compteur. Liste blanche (voir `AllowedNodeTypesVisitor`) :
 * un type de nœud ajouté plus tard au langage est exclu par défaut tant qu'il n'est pas ajouté ici
 * explicitement. */
const ALLOWED_NODE_TYPES: ASTNode["type"][] = [
	"IDENTIFIER",
	"BOOLEAN_LITERAL",
	"NUMBER_LITERAL",
	"STRING_LITERAL",
	"ARITHMETIC_EXPRESSION",
	"COMPARISON_EXPRESSION",
];

/**
 * Validation propre à un bloc `"compare"` — voir `CompareBlockParams`. Contrairement à
 * PT/PV, l'expression n'est jamais découpée en littéral/variable : elle est lexée/parsée comme une
 * expression ordinaire (même pipeline que `TransitionAnalyser`), doit rester dans le sous-ensemble
 * arithmétique/comparaison (voir `ALLOWED_NODE_TYPES`), et son type final doit être booléen.
 * Appelé par `BlockAnalyser`, qui dispatche par `blockType`.
 */
export default class CompareBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "compare") return [];
		const { expression } = element.data.params;

		if (!expression || expression.trim() === "") {
			return [
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_COMPARE_EXPRESSION_EMPTY",
					source,
					"L'expression de ce bloc de comparaison doit être renseignée.",
				),
			];
		}

		try {
			const node = new Parser(new Lexer(dialect).tokenize(expression)).parse();

			const violation = new AllowedNodeTypesVisitor(ALLOWED_NODE_TYPES).visit(node)[0];
			if (violation?.type === "ASSIGN_STATEMENT") {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COMPARE_ASSIGNMENT_NOT_ALLOWED",
						source,
						"Expression invalide : ce bloc ne peut pas contenir d'affectation.",
					),
				];
			}
			if (violation) {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COMPARE_OPERATOR_NOT_ALLOWED",
						source,
						"Expression invalide : seules les opérations arithmétiques et de comparaison sont autorisées.",
					),
				];
			}

			const env = new Environment(
				Array.from(variablesByMnemonic.values()).map(SchemaVariablesMapper.schemaToEnv),
			);
			new SemanticAnalyserVisitor(env).visit(node);
			const resultType = new TypeAnalyserVisitor(env).visit(node);
			if (resultType !== "boolean") {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_COMPARE_EXPRESSION_NOT_BOOLEAN",
						source,
						"Expression invalide : ce bloc doit retourner un booléen.",
					),
				];
			}
		} catch (e) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_COMPARE_INVALID_EXPRESSION",
					source,
					SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR"),
				),
			];
		}

		return [];
	}
}
