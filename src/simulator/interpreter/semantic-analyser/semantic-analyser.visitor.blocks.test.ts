import EnvVariable from "../environment/env-variable";
import { Environment } from "../environment/environment";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import SemanticAnalyserVisitor from "./semantic-analyser.visitor";
import InvalidTimerInputTypeException from "./exceptions/invalid-timer-input-type.exception";
import InvalidTimerLastInputNodeException from "./exceptions/invalid-timer-last-input-node.exception";
import InvalidTimerLastInputTypeException from "./exceptions/invalid-timer-last-input-type.exception";
import InvalidTimerOutputNodeException from "./exceptions/invalid-timer-output-node.exception";
import InvalidTimerOutputTypeException from "./exceptions/invalid-timer-output-type.exception";
import InvalidTimerPresetTimeTypeException from "./exceptions/invalid-timer-preset-time-type.exception";
import InvalidTimerElapsedTimeNodeException from "./exceptions/invalid-timer-elapsed-time-node.exception";
import InvalidTimerElapsedTimeTypeException from "./exceptions/invalid-timer-elapsed-time-type.exception";
import InvalidCounterInputTypeException from "./exceptions/invalid-counter-input-type.exception";
import InvalidCounterLastInputNodeException from "./exceptions/invalid-counter-last-input-node.exception";
import InvalidCounterControlTypeException from "./exceptions/invalid-counter-control-type.exception";
import InvalidCounterCurrentValueNodeException from "./exceptions/invalid-counter-current-value-node.exception";
import InvalidCounterCurrentValueTypeException from "./exceptions/invalid-counter-current-value-type.exception";
import InvalidCounterOutputNodeException from "./exceptions/invalid-counter-output-node.exception";
import InvalidCounterOutputTypeException from "./exceptions/invalid-counter-output-type.exception";
import InvalidCounterPresetValueTypeException from "./exceptions/invalid-counter-preset-value-type.exception";
import UnknownVariableNameException from "../environment/exceptions/unknown-variable-name.exception";
import InvalidBinaryExprOperandTypeException from "./exceptions/invalid-binary-expr-operand-type.exception";
import IncompatibleOperandsTypesException from "./exceptions/incompatible-operands-types.exception";

const id = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);

describe("SemanticAnalyserVisitor : block operands", () => {
	let analyser: SemanticAnalyserVisitor;

	beforeEach(() => {
		const env = new Environment([
			new EnvVariable("b1", "b1", "boolean", "IN"),
			new EnvVariable("b2", "b2", "boolean", "INOUT"),
			new EnvVariable("b3", "b3", "boolean", "OUT"),
			new EnvVariable("n1", "n1", "number", "IN"),
			new EnvVariable("n2", "n2", "number", "INOUT"),
			new EnvVariable("n3", "n3", "number", "OUT"),
		]);
		analyser = new SemanticAnalyserVisitor(env);
	});

	const caught = (node: ASTNode): unknown => {
		try {
			analyser.visit(node);
		} catch (e) {
			return e;
		}
		return undefined;
	};

	describe("timer", () => {
		const timer = (
			overrides: Partial<
				Record<
					"input" | "lastInput" | "presetTime" | "elapsedTime" | "output",
					ASTNode
				>
			> = {},
		) =>
			BlocksBuilder.buildTimerNode(
				"TON",
				overrides.input ?? id("b1"),
				overrides.lastInput ?? id("b2"),
				overrides.presetTime ?? id("n1"),
				overrides.elapsedTime ?? id("n2"),
				overrides.output ?? id("b3"),
			);

		it("accepts valid operands", () => {
			expect(caught(timer())).toBeUndefined();
		});

		it.each([
			["input type", { input: id("n1") }, InvalidTimerInputTypeException],
			[
				"lastInput node",
				{ lastInput: LiteralsBuilder.buildBooleanNode(true) },
				InvalidTimerLastInputNodeException,
			],
			[
				"lastInput type",
				{ lastInput: id("n2") },
				InvalidTimerLastInputTypeException,
			],
			[
				"output node",
				{ output: LiteralsBuilder.buildBooleanNode(true) },
				InvalidTimerOutputNodeException,
			],
			["output type", { output: id("n3") }, InvalidTimerOutputTypeException],
			[
				"presetTime type",
				{ presetTime: id("b1") },
				InvalidTimerPresetTimeTypeException,
			],
			[
				"elapsedTime node",
				{ elapsedTime: LiteralsBuilder.buildNumberNode(1) },
				InvalidTimerElapsedTimeNodeException,
			],
			[
				"elapsedTime type",
				{ elapsedTime: id("b2") },
				InvalidTimerElapsedTimeTypeException,
			],
		] as const)("throws on invalid %s", (_label, overrides, exception) => {
			expect(caught(timer(overrides))).toBeInstanceOf(exception);
		});

		it("rejects an unknown identifier nested in the input expression", () => {
			const input = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("unknown"),
			);
			expect(caught(timer({ input }))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});

		it("rejects a numeric operand inside a logical input expression", () => {
			const input = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("n1"),
			);
			expect(caught(timer({ input }))).toBeInstanceOf(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("rejects a number/boolean comparison inside the input expression", () => {
			const input = ExpressionsBuilder.buildComparisonExpressionNode(
				"=",
				id("n1"),
				id("b1"),
			);
			expect(caught(timer({ input }))).toBeInstanceOf(
				IncompatibleOperandsTypesException,
			);
		});

		it("rejects an unknown identifier nested in the preset time expression", () => {
			const presetTime = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id("n1"),
				id("unknown"),
			);
			expect(caught(timer({ presetTime }))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});
	});

	describe("timer string declaration", () => {
		it("accepts a boolean input", () => {
			expect(
				caught(
					BlocksBuilder.buildTimerStringDeclarationNode("t", id("b1"), 1000),
				),
			).toBeUndefined();
		});

		it("rejects a non-boolean input", () => {
			expect(
				caught(
					BlocksBuilder.buildTimerStringDeclarationNode("t", id("n1"), 1000),
				),
			).toBeInstanceOf(InvalidTimerInputTypeException);
		});

		it("rejects an unknown identifier nested in the input expression", () => {
			const input = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("unknown"),
			);
			expect(
				caught(BlocksBuilder.buildTimerStringDeclarationNode("t", input, 1000)),
			).toBeInstanceOf(UnknownVariableNameException);
		});
	});

	describe("counter", () => {
		const counter = (
			overrides: Partial<
				Record<
					| "input"
					| "lastInput"
					| "control"
					| "presetValue"
					| "currentValue"
					| "output",
					ASTNode
				>
			> = {},
		) =>
			BlocksBuilder.buildCounterNode(
				"CTU",
				overrides.input ?? id("b1"),
				overrides.lastInput ?? id("b2"),
				overrides.control ?? id("b1"),
				overrides.presetValue ?? id("n1"),
				overrides.currentValue ?? id("n2"),
				overrides.output ?? id("b3"),
			);

		it("accepts valid operands", () => {
			expect(caught(counter())).toBeUndefined();
		});

		it.each([
			["input type", { input: id("n1") }, InvalidCounterInputTypeException],
			[
				"lastInput node",
				{ lastInput: LiteralsBuilder.buildBooleanNode(true) },
				InvalidCounterLastInputNodeException,
			],
			[
				"control type",
				{ control: id("n1") },
				InvalidCounterControlTypeException,
			],
			[
				"currentValue node",
				{ currentValue: LiteralsBuilder.buildNumberNode(1) },
				InvalidCounterCurrentValueNodeException,
			],
			[
				"currentValue type",
				{ currentValue: id("b2") },
				InvalidCounterCurrentValueTypeException,
			],
			[
				"output node",
				{ output: LiteralsBuilder.buildBooleanNode(true) },
				InvalidCounterOutputNodeException,
			],
			["output type", { output: id("n3") }, InvalidCounterOutputTypeException],
			[
				"presetValue type",
				{ presetValue: id("b1") },
				InvalidCounterPresetValueTypeException,
			],
		] as const)("throws on invalid %s", (_label, overrides, exception) => {
			expect(caught(counter(overrides))).toBeInstanceOf(exception);
		});

		it("rejects an unknown identifier nested in the control expression", () => {
			const control = ExpressionsBuilder.buildLogicalExpressionNode(
				"OR",
				id("b1"),
				id("unknown"),
			);
			expect(caught(counter({ control }))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});

		it("rejects an unknown identifier nested in the input expression", () => {
			const input = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("unknown"),
			);
			expect(caught(counter({ input }))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});

		it("rejects an unknown identifier nested in the preset value expression", () => {
			const presetValue = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id("n1"),
				id("unknown"),
			);
			expect(caught(counter({ presetValue }))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});
	});

	describe("counter CTUD down part", () => {
		const ctud = (downInput: ASTNode, downLoad: ASTNode = id("b1")) =>
			BlocksBuilder.buildCounterNode(
				"CTUD",
				id("b1"),
				id("b2"),
				id("b1"),
				id("n1"),
				id("n2"),
				id("b3"),
				{
					input: downInput,
					lastInput: id("b2"),
					load: downLoad,
					output: id("b3"),
				},
			);

		it("rejects an unknown identifier nested in the down input", () => {
			const input = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("unknown"),
			);
			expect(caught(ctud(input))).toBeInstanceOf(UnknownVariableNameException);
		});

		it("rejects an unknown identifier nested in the down load", () => {
			const load = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				id("b1"),
				id("unknown"),
			);
			expect(caught(ctud(id("b1"), load))).toBeInstanceOf(
				UnknownVariableNameException,
			);
		});
	});
});
