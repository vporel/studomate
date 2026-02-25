import { Environment } from "@/simulation/runtime/Environment.class";
import { ASTNode, BinaryOperatorNode } from "../parser/AST";
import IncompatibleOperandsTypesException from "./exceptions/IncompatibleOperandsTypesException.class";
import InputIdentifierAssignmentException from "./exceptions/InputIdentifierAssignmentException.class";
import InvalidAssignmentTargetException from "./exceptions/InvalidAssignmentTargetException.class";
import InvalidOperandTypeException from "./exceptions/InvalidOperandTypeException.class";
import UnknownIdentifierException from "./exceptions/UnknownIdentifierException.class";
import { OperationSide, PossibleNodeResultType } from "./types";

export default class SemanticAnalyser {
	/**
	 *
	 * @param node
	 * @param env
	 * @returns
	 * @throws SemanticException if a semantic error is detected during the analysis
	 */
	analyse(node: ASTNode, env: Environment): void {
		switch (node.type) {
			case "IDENTIFIER":
				if (!env.existsVariableWithName(node.value)) throw new UnknownIdentifierException(node);
			case "NUMBER":
				// nothing to check for numbers
				break;
			case "STRING":
				// nothing to check for strings
				break;
			case "NOT":
				this.analyse(node.expr, env);
				break;
			case "AND":
				this.analyse(node.left, env);
				this.analyse(node.right, env);
				// Check that both operands are boolean
				this.checkIsBooleanOperand("AND", "left", node.left, node, env);
				this.checkIsBooleanOperand("AND", "right", node.right, node, env);
				break;
			case "OR":
				this.analyse(node.left, env);
				this.analyse(node.right, env);
				// Check that both operands are boolean
				this.checkIsBooleanOperand("OR", "left", node.left, node, env);
				this.checkIsBooleanOperand("OR", "right", node.right, node, env);
				break;
			case "COMPARE":
				this.analyse(node.left, env);
				this.analyse(node.right, env);
				// Check that both operands are of the same type
				const leftType = this.getNodePossibleResultType(node.left, env);
				const rightType = this.getNodePossibleResultType(node.right, env);
				if (leftType !== rightType) {
					throw new IncompatibleOperandsTypesException(node.operator, leftType, rightType, node);
				}
				if (node.operator !== "=" && node.operator !== "<>") {
					// For comparison operators other than equality and inequality, check that both operands are numbers
					if (leftType !== "number") {
						throw new InvalidOperandTypeException(
							node.operator,
							"left",
							"number",
							leftType,
							node,
						);
					}
					if (rightType !== "number") {
						throw new InvalidOperandTypeException(
							node.operator,
							"right",
							"number",
							rightType,
							node,
						);
					}
				}
				break;
			case "ARITHMETIC":
				this.analyse(node.left, env);
				this.analyse(node.right, env);
				// Check that both operands are numbers
				const leftOperandType = this.getNodePossibleResultType(node.left, env);
				const rightOperandType = this.getNodePossibleResultType(node.right, env);
				if (leftOperandType !== "number") {
					throw new InvalidOperandTypeException(
						node.operator,
						"left",
						"number",
						leftOperandType,
						node,
					);
				}
				if (rightOperandType !== "number") {
					throw new InvalidOperandTypeException(
						node.operator,
						"right",
						"number",
						rightOperandType,
						node,
					);
				}
				break;
			case "ASSIGN":
				this.analyse(node.left, env);
				this.analyse(node.right, env);
				// Check that the left operand is an identifier
				if (node.left.type !== "IDENTIFIER") {
					throw new InvalidAssignmentTargetException(node);
				}
				const leftType_ = env.getVariableTypeByName(node.left.value);
				const rightType_ = this.getNodePossibleResultType(node.right, env);
				//Check that the variable being assigned to is not an IN variable
				const variableDirection = env.getVariableDirectionByName(node.left.value);
				if (variableDirection === "IN") {
					throw new InputIdentifierAssignmentException(node);
				}
				// Check that the type of the right operand is compatible with the type of the variable being assigned to
				if (leftType_ !== rightType_) {
					throw new IncompatibleOperandsTypesException(":=", leftType_, rightType_, node);
				}
				break;
		}
	}

	/**
	 * @param node
	 * @throws
	 */
	private checkIsBooleanOperand(
		operator: string,
		side: OperationSide,
		node: ASTNode,
		originNode: BinaryOperatorNode,
		env: Environment,
	): void {
		switch (node.type) {
			case "IDENTIFIER":
				const variableType = env.getVariableTypeByName(node.value);
				if (variableType !== "boolean")
					throw new InvalidOperandTypeException(
						operator,
						side,
						"boolean",
						variableType,
						originNode,
					);

				break;

			case "NUMBER":
				throw new InvalidOperandTypeException(operator, side, "boolean", "number", originNode);
			case "STRING":
				throw new InvalidOperandTypeException(operator, side, "boolean", "string", originNode);
			default:
			//Nothing can be done for other types of nodes
		}
	}

	private getNodePossibleResultType(node: ASTNode, env: Environment): PossibleNodeResultType {
		switch (node.type) {
			case "IDENTIFIER":
				return env.getVariableTypeByName(node.value);
			case "NUMBER":
				return "number";
			case "STRING":
				return "string";
			case "BOOLEAN":
				return "boolean";
			case "NOT":
				return "boolean";
			case "AND":
			case "OR":
				return "boolean";
			case "COMPARE":
				// Comparison operators always return boolean
				return "boolean";
			case "ARITHMETIC":
				// Arithmetic operators always return number
				return "number";
			case "ASSIGN":
				// The type of an assignment expression is the type of the right-hand side
				return this.getNodePossibleResultType(node.right, env);
		}
	}
}
