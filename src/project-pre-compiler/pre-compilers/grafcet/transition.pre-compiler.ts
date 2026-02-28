import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Transition from "../../../schemas/grafcet/transition.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";

export type PreCompiledTransition = {
	node: ASTNode;
};

export default class TransitionPreCompiler {
	/**
	 * Pre-compiles a Transition's expression into a ready-to-evaluate AST node.
	 * The analyser should have already verified that the expression is valid,
	 * so this method can assume it is correct and directly simplify the AST for faster evaluation in the simulator.
	 */
	static preCompile(transition: Transition, grafcet: Grafcet, language: Language): PreCompiledTransition {
		const expression = transition.data.expression.trim(); //The analyser ensures this is not undefined and not empty
		const tokens = new Lexer(language).tokenize(transition.getFullExpression());
		const parsed = new Parser(tokens).parse();
		//The semantic analysis should have already been done in the analyser, so we can skip it here and directly simplify the AST
		const node = new SimplifierVisitor().visit(parsed);
		return {
			node,
		};
	}
}
