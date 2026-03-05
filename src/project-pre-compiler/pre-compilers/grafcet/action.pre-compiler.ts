import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import Action, { ActionExecutionMode, ActionType } from "../../../schemas/grafcet/action.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import VariablesMapper from "../../../simulator/bridge/variables.mapper";
import IdentifiersBuilder from "../../../simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "../../../simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "../../../simulator/compiler/ast/builders/statements.builder";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import { Environment } from "../../../simulator/compiler/environment/environment";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";
import SemanticAnalyserVisitor from "../../../simulator/compiler/semantic-analyser/semantic-analyser.visitor";

/**
 * A compiled action, split into three execution phasesList: PreCompiledActionPhases[] = [];.
 * The simulator decides which phase to run based on the step's lifecycle.
 *
 * - onActivation  : executed once when the step becomes active  (RISING_EDGE, SET, RESET)
 * - continuous    : executed every scan cycle while step is active (CONTINUOUS)
 * - onDeactivation: executed once when the step becomes inactive (FALLING_EDGE, CONTINUOUS boolean cleanup)
 */
export type PreCompiledActionPhases = {
	onActivation: ASTNode[];
	continuous: ASTNode[];
	onDeactivation: ASTNode[];
};

/**
 * Only contains entries for non-TEXT actions.
 * TEXT actions are purely descriptive and produce no runtime effect.
 */
export type PreCompiledAction = {
	phases: PreCompiledActionPhases;
	stepId: string; //The id of the single step that can activate this action
};

export default class ActionPreCompiler {
	/**
	 * Compiles an Action into its execution phasesList: PreCompiledActionPhases[] = [];.
	 * Returns `null` for TEXT actions (purely descriptive, no runtime effect) or action without expression.
	 *
	 * @throws ProjectPreCompilerError if the expression is invalid.
	 */
	static preCompile(
		action: Action,
		grafcet: Grafcet,
		variables: PLCVariable[],
		language: Language,
	): PreCompiledAction | null {
		if (
			action.data.type === ActionType.TEXT ||
			action.data.expression === undefined ||
			action.data.expression.trim() === ""
		)
			return null;
		let phases: PreCompiledActionPhases = { onActivation: [], continuous: [], onDeactivation: [] };
		if (action.data.type === ActionType.BOOLEAN_VARIABLE) {
			phases = this.compileBooleanAction(action, variables);
		} else {
			phases = this.compileExpressionAction(action, variables, language);
		}
		return {
			phases,
			stepId: ActionHelper.getStep(action.id, grafcet)!.id, //The analyser should have already verified that the action is connected to exactly one step
		};
	}

	// ─── Boolean variable actions ─────────────────────────────────────────────

	/**
	 * For BOOLEAN_VARIABLE actions, the expression is the variable mnemonic only.
	 * The assignment value is dictated by the execution mode:
	 *
	 * | Mode         | onActivation      | onDeactivation    |
	 * |--------------|-------------------|-------------------|
	 * | SET          | mnemonic := TRUE  | —                 |
	 * | RESET        | mnemonic := FALSE | —                 |
	 * | CONTINUOUS   | mnemonic := TRUE  | mnemonic := FALSE |
	 * | RISING_EDGE  | mnemonic := TRUE  | —                 |
	 * | FALLING_EDGE | —                 | mnemonic := TRUE  |
	 */
	private static compileBooleanAction(
		action: Action,
		plcVariables: PLCVariable[],
	): PreCompiledActionPhases {
		const env = new Environment(plcVariables.map(VariablesMapper.plcToEnv));
		const phases: PreCompiledActionPhases = { onActivation: [], continuous: [], onDeactivation: [] };
		action.getExpressionLines().forEach((mnemonic) => {
			const simplifier = new SimplifierVisitor();

			const buildValidated = (value: boolean): ASTNode => {
				const node = StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode(mnemonic, 0),
					LiteralsBuilder.buildBooleanNode(value, 0),
					0,
				);
				new SemanticAnalyserVisitor(env).visit(node);
				return simplifier.visit(node);
			};

			switch (action.data.executionMode) {
				case ActionExecutionMode.SET:
					phases.onActivation.push(buildValidated(true));
					break;
				case ActionExecutionMode.RESET:
					phases.onActivation.push(buildValidated(false));
					break;
				case ActionExecutionMode.CONTINUOUS:
					phases.onActivation.push(buildValidated(true));
					phases.onDeactivation.push(buildValidated(false));
					break;
				case ActionExecutionMode.RISING_EDGE:
					phases.onActivation.push(buildValidated(true));
					break;
				case ActionExecutionMode.FALLING_EDGE:
					phases.onDeactivation.push(buildValidated(true));
					break;
				default:
					break;
			}
		});
		return phases;
	}

	// ─── Numeric / String variable actions ───────────────────────────────────

	/**
	 * For NUMERIC_VARIABLE and STRING_VARIABLE actions, the expression is a full
	 * assignment statement (e.g. `M1 := E1 + 5`).
	 *
	 * | Mode         | onActivation | continuous | onDeactivation |
	 * |--------------|--------------|------------|----------------|
	 * | CONTINUOUS   | —            | node       | —              |
	 * | RISING_EDGE  | node         | —          | —              |
	 * | FALLING_EDGE | —            | —          | node           |
	 */
	private static compileExpressionAction(
		action: Action,
		plcVariables: PLCVariable[],
		language: Language,
	): PreCompiledActionPhases {
		const env = new Environment(plcVariables.map(VariablesMapper.plcToEnv));
		const phases: PreCompiledActionPhases = { onActivation: [], continuous: [], onDeactivation: [] };
		action.getExpressionLines().forEach((line) => {
			const tokens = new Lexer(language).tokenize(line);
			const parsed = new Parser(tokens).parse();
			new SemanticAnalyserVisitor(env).visit(parsed);
			const simplified = new SimplifierVisitor().visit(parsed);

			switch (action.data.executionMode) {
				case ActionExecutionMode.CONTINUOUS:
					phases.continuous.push(simplified);
					break;
				case ActionExecutionMode.RISING_EDGE:
					phases.onActivation.push(simplified);
					break;
				case ActionExecutionMode.FALLING_EDGE:
					phases.onDeactivation.push(simplified);
					break;
				default:
					//Should never happen due to frontend and calling method validation, but we put a default case to satisfy the return type
					break;
			}
		});
		return phases;
	}
}
