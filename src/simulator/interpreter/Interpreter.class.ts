import { Environment } from "../runtime/Environment.class";
import { VariableValue } from "../runtime/Variable.class";
import { DivisionByZeroException } from "./exceptions/DivisionByZeroException.class";
import InterpreterException from "./exceptions/InterpreterException.class";
import { Language } from "./lexer/Language.enum";
import { Lexer } from "./lexer/Lexer.class";
import { ASTNode } from "./parser/AST";
import Parser from "./parser/Parser.class";
import SemanticAnalyser from "./semantic-analyzer/SemanticAnalyser.class";
import Simplifier from "./simplifier/Simplifier.class";

/**
 * The following options can be set to false
 * when the AST is already semantically analyzed or simplified, to avoid redundant work and improve performance.
 * If not specified, both options default to true
 */
type EvaluateASTOptions = {
	semanticAnalysis?: boolean; // Whether to perform semantic analysis before evaluation
	simplification?: boolean; // Whether to simplify the AST before evaluation
};

export default class Interpreter {
	private lexer: Lexer;
	private semanticAnalyser: SemanticAnalyser;
	private simplifier: Simplifier;

	constructor(language: Language) {
		this.lexer = new Lexer(language);
		this.semanticAnalyser = new SemanticAnalyser();
		this.simplifier = new Simplifier();
	}

	evaluate(input: string, env: Environment): VariableValue {
		const tokens = this.lexer.tokenize(input);
		const parser = new Parser(tokens);
		const ast = parser.parse();
		return this.evaluateAST(ast, env);
	}

	/**
	 * @param node
	 * @param env
	 * @param options
	 * @returns
	 * @throws SemacticException if a semantic error is detected during the analysis
	 * @throws InterpreterException if an error occurs during the simplification or evaluation (e.g. division by zero, invalid assignment target, etc.)
	 */
	evaluateAST(node: ASTNode, env: Environment, options?: EvaluateASTOptions): VariableValue {
		if (options?.semanticAnalysis ?? true) {
			this.semanticAnalyser.analyse(node, env);
		}
		if (options?.simplification ?? true) {
			node = this.simplifier.simplifyAST(node);
		}
		switch (node.type) {
			case "IDENTIFIER":
				// Handle identifier evaluation
				return env.getVariableValueByName(node.value);
			case "BOOLEAN":
				return node.value;
			case "NUMBER":
				return node.value;
			case "STRING":
				return node.value;
			case "NOT":
				return !this.evaluateAST(node.expr, env);
			case "AND":
				//Use double negation to ensure the result is a boolean
				return !!(this.evaluateAST(node.left, env) && this.evaluateAST(node.right, env));
			case "OR":
				//Use double negation to ensure the result is a boolean
				return !!(this.evaluateAST(node.left, env) || this.evaluateAST(node.right, env));
			case "COMPARE":
				// Handle comparison evaluation based on the operator
				const leftValue = this.evaluateAST(node.left, env);
				const rightValue = this.evaluateAST(node.right, env);
				switch (node.operator) {
					case "=":
						return leftValue === rightValue;
					case "<>":
						return leftValue !== rightValue;
					case "<":
						return leftValue < rightValue;
					case "<=":
						return leftValue <= rightValue;
					case ">":
						return leftValue > rightValue;
					case ">=":
						return leftValue >= rightValue;
				}
				break;
			case "ARITHMETIC":
				// Handle arithmetic evaluation based on the operator
				// We assume that the left and right expressions evaluate to numbers
				//It's safe since the semantic analysis should have already checked the types
				const leftNum = this.evaluateAST(node.left, env) as number;
				const rightNum = this.evaluateAST(node.right, env) as number;
				switch (node.operator) {
					case "+":
						return leftNum + rightNum;
					case "-":
						return leftNum - rightNum;
					case "*":
						return leftNum * rightNum;
					case "/":
						if (rightNum === 0) {
							throw new DivisionByZeroException(leftNum, rightNum);
						}
						return leftNum / rightNum;
				}
				break;
			case "ASSIGN":
				// Handle assignment evaluation
				if (node.left.type !== "IDENTIFIER") {
					throw new InterpreterException("Left-hand side of assignment must be an identifier");
				}
				const value = this.evaluateAST(node.right, env);
				env.setVariableValueByName(node.left.value, value);
				return value;
		}
	}
}
