import { GRAFCET_ACTION_TYPE } from "../../../schemas/grafcet/element.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Transition from "../../../schemas/grafcet/transition.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";

export type PreCompiledTransition = {
	node: ASTNode;
	actionsIds: string[]; //The ids of all actions that should be executed when this transition is triggered
};

export default class TransitionPreCompiler {
	/**
	 * Compiles a Transition's expression into a ready-to-evaluate AST node.
	 * An empty expression is compiled to `FALSE` (transition never triggered).
	 *
	 * @throws ProjectPreCompilerError if the expression is lexically, syntactically, or semantically invalid.
	 */
	static preCompile(transition: Transition, grafcet: Grafcet, language: Language): PreCompiledTransition {
		const expression = transition.data.expression.trim(); //The analyser ensures this is not undefined and not empty
		const tokens = new Lexer(language).tokenize(expression);
		const parsed = new Parser(tokens).parse();
		//The semantic analysis should have already been done in the analyser, so we can skip it here and directly simplify the AST
		const node = new SimplifierVisitor().visit(parsed);
		return {
			node,
			actionsIds: grafcet
				.getConnectionsByElementId(transition.id)
				.filter((c) => c.target.type === GRAFCET_ACTION_TYPE)
				.map((c) => c.target.id),
		};
	}
}
