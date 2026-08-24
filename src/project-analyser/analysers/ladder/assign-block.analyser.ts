import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import SchemaVariablesMapper from "@/bridge/variables.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import AllowedNodeTypesVisitor from "@/expression-language/ast/visitors/allowed-node-types.visitor";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
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

/** Seuls ces types de nœud sont autorisés dans l'expression d'un bloc assign — l'affectation
 * elle-même (exactement une, voir `analyse`), tout opérande/opérateur ordinaire (identifiants,
 * littéraux, arithmétique, comparaison, logique, NON), jamais un bloc timer/compteur/temporisation
 * ni un contrôle conditionnel. Liste blanche (voir `AllowedNodeTypesVisitor`) : un type de nœud
 * ajouté plus tard au langage est exclu par défaut tant qu'il n'est pas ajouté ici explicitement. */
const ALLOWED_NODE_TYPES: ASTNode["type"][] = [
	"IDENTIFIER",
	"BOOLEAN_LITERAL",
	"NUMBER_LITERAL",
	"STRING_LITERAL",
	"UNARY_EXPRESSION",
	"ARITHMETIC_EXPRESSION",
	"COMPARISON_EXPRESSION",
	"LOGICAL_EXPRESSION",
	"ASSIGN_STATEMENT",
];

/**
 * Validation propre à un bloc `"assign"` — voir `AssignBlockParams`. Contrairement à
 * `CompareBlockAnalyser`, aucune contrainte de type final (l'affectation peut cibler une variable
 * de n'importe quel type) : seule compte la présence d'exactement une affectation, dans le
 * sous-ensemble autorisé de la grammaire. Appelé par `BlockAnalyser`, qui dispatche par
 * `blockType`.
 */
export default class AssignBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "assign") return [];
		const { expression } = element.data.params;

		if (!expression || expression.trim() === "") {
			return [
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_ASSIGN_EXPRESSION_EMPTY",
					source,
					"L'expression de ce bloc d'affectation doit être renseignée.",
				),
			];
		}

		try {
			const node = new Parser(new Lexer(dialect).tokenize(expression)).parse();

			if (node.type !== "ASSIGN_STATEMENT") {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_ASSIGN_NOT_AN_ASSIGNMENT",
						source,
						`Expression invalide : ce bloc doit contenir une affectation (ex. "A := B").`,
					),
				];
			}

			const assignmentCount = new FinderVisitor("ASSIGN_STATEMENT").visit(node).length;
			if (assignmentCount > 1) {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_ASSIGN_MULTIPLE_ASSIGNMENTS",
						source,
						"Expression invalide : ce bloc ne peut contenir qu'une seule affectation.",
					),
				];
			}

			const violation = new AllowedNodeTypesVisitor(ALLOWED_NODE_TYPES).visit(node)[0];
			if (violation) {
				return [
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_ASSIGN_OPERATOR_NOT_ALLOWED",
						source,
						"Expression invalide : ce bloc ne peut pas contenir de bloc timer/compteur.",
					),
				];
			}

			const env = new Environment(
				Array.from(variablesByMnemonic.values()).map(SchemaVariablesMapper.schemaToEnv),
			);
			new SemanticAnalyserVisitor(env).visit(node);
		} catch (e) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_ASSIGN_INVALID_EXPRESSION",
					source,
					SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR"),
				),
			];
		}

		return [];
	}
}
