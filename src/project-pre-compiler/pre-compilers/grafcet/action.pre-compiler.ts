import Action, {
	ACTION_HANDLES,
	ActionExecutionMode,
	ActionType,
} from "../../../schemas/grafcet/action.schema";
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
import { PLCVariable } from "../../../simulator/core/plc/plc";

/**
 * A compiled action, split into three execution phases.
 * The simulator decides which phase to run based on the step's lifecycle.
 *
 * - onActivation  : executed once when the step becomes active  (RISING_EDGE, SET, RESET)
 * - continuous    : executed every scan cycle while step is active (CONTINUOUS)
 * - onDeactivation: executed once when the step becomes inactive (FALLING_EDGE, CONTINUOUS boolean cleanup)
 */
export type PreCompiledActionPhases = {
	onActivation: ASTNode | null;
	continuous: ASTNode | null;
	onDeactivation: ASTNode | null;
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
	 * Compiles an Action into its execution phases.
	 * Returns `null` for TEXT actions (purely descriptive, no runtime effect).
	 *
	 * @throws ProjectPreCompilerError if the expression is invalid.
	 */
	static preCompile(
		action: Action,
		grafcet: Grafcet,
		plcVariables: PLCVariable[],
		language: Language,
	): PreCompiledAction | null {
		if (action.data.type === ActionType.TEXT) return null;
		let phases: PreCompiledActionPhases;
		if (action.data.type === ActionType.BOOLEAN_VARIABLE) {
			phases = this.compileBooleanAction(action, plcVariables);
		} else {
			phases = this.compileExpressionAction(action, plcVariables, language);
		}
		return {
			phases,
			stepId: grafcet
				.getConnectionsByElementIdAndHandleId(action.id, ACTION_HANDLES.fromStep)
				.map((c) => c.source.id)[0], //An action can only have one step as source, so we take the first id
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
		const mnemonic = action.data.expression.trim();
		const env = new Environment(plcVariables.map(VariablesMapper.plcToEnv));
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
				return { onActivation: buildValidated(true), continuous: null, onDeactivation: null };

			case ActionExecutionMode.RESET:
				return { onActivation: buildValidated(false), continuous: null, onDeactivation: null };

			case ActionExecutionMode.CONTINUOUS:
				return {
					onActivation: buildValidated(true),
					continuous: null,
					onDeactivation: buildValidated(false),
				};

			case ActionExecutionMode.RISING_EDGE:
				return { onActivation: buildValidated(true), continuous: null, onDeactivation: null };

			case ActionExecutionMode.FALLING_EDGE:
				return { onActivation: null, continuous: null, onDeactivation: buildValidated(true) };

			default:
				return { onActivation: null, continuous: null, onDeactivation: null };
		}
	}

	// ─── Numeric / String variable actions ───────────────────────────────────

	/**
	 * For NUMERIC_VARIABLE and STRING_VARIABLE actions, the expression is a full
	 * assignment statement (e.g. `M1 := E1 + 5`).
	 *
	 * | Mode         | onActivation | continuous | onDeactivation |
	 * |--------------|--------------|------------|----------------|
	 * | CONTINUOUS   | —            | routine    | —              |
	 * | RISING_EDGE  | routine      | —          | —              |
	 * | FALLING_EDGE | —            | —          | routine        |
	 */
	private static compileExpressionAction(
		action: Action,
		plcVariables: PLCVariable[],
		language: Language,
	): PreCompiledActionPhases {
		const expression = action.data.expression.trim();
		const env = new Environment(plcVariables.map(VariablesMapper.plcToEnv));
		const tokens = new Lexer(language).tokenize(expression);
		const parsed = new Parser(tokens).parse();
		new SemanticAnalyserVisitor(env).visit(parsed);
		const simplified = new SimplifierVisitor().visit(parsed);

		switch (action.data.executionMode) {
			case ActionExecutionMode.CONTINUOUS:
				return { onActivation: null, continuous: simplified, onDeactivation: null };
			case ActionExecutionMode.RISING_EDGE:
				return { onActivation: simplified, continuous: null, onDeactivation: null };
			case ActionExecutionMode.FALLING_EDGE:
				return { onActivation: null, continuous: null, onDeactivation: simplified };
			default:
				//Should never happen due to frontend and calling method validation, but we put a default case to satisfy the return type
				return { onActivation: null, continuous: null, onDeactivation: null };
		}
	}
}
