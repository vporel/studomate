import { TimerStringDeclarationNode } from "@/simulator/compiler/ast/nodes/blocks";
import FinderVisitor from "@/simulator/compiler/ast/visitors/finder.visitor";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Transition from "../../../schemas/grafcet/transition.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";

export type PreCompiledTransition = {
	node: ASTNode;
	timers: TimerStringDeclarationNode[];
};

export default class TransitionPreCompiler {
	static preCompile(transition: Transition, grafcet: Grafcet, language: Language): PreCompiledTransition {
		const tokens = new Lexer(language).tokenize(transition.getFullExpression());
		const parsed = new Parser(tokens).parse();
		//The semantic analysis should have already been done in the analyser, so we can skip it here and directly simplify the AST
		const node = new SimplifierVisitor().visit(parsed);
		const timers = new FinderVisitor<TimerStringDeclarationNode>("TIMER_STRING_DECLARATION").visit(node);
		return {
			node,
			timers,
		};
	}
}
