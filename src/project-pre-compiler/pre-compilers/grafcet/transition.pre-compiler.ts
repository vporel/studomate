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
import Transition from "../../../schemas/grafcet/transition.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import SimplifierVisitor from "../../../simulator/compiler/interpreter/simplifier/simplifier.visitor";
import { Language } from "../../../simulator/compiler/lexer/language.enum";
import { Lexer } from "../../../simulator/compiler/lexer/lexer";
import Parser from "../../../simulator/compiler/parser/parser";

export type PreCompiledTransition = {
	node: ASTNode;
	timers: TimerNode[];
};

export default class TransitionPreCompiler {
	static preCompile(
		transition: Transition,
		grafcet: Grafcet,
		variables: PLCVariable[],
		language: Language,
	): PreCompiledTransition {
		const tokens = new Lexer(language).tokenize(transition.getFullExpression());
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

		return {
			node,
			timers,
		};
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
