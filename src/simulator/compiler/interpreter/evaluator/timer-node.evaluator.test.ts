import TimerNodeEvaluator from "./timer-node.evaluator";
import { Environment } from "../../environment/environment";
import EnvVariable from "../../environment/env-variable";
import { TimerNode } from "../../ast/nodes/blocks";
import { IdentifierNode } from "../../ast/nodes/identifiers";
import IdentifiersBuilder from "../../ast/builders/identifiers.builder";
import BlocksBuilder from "../../ast/builders/blocks.builder";
import { BaseVisitor } from "../../ast/visitors/base.visitor";
import { EnvVariableValue } from "../../environment/env-variable";

class MockVisitor extends BaseVisitor<EnvVariableValue> {
	private env: Environment;

	constructor(env: Environment) {
		super();
		this.env = env;
	}

	protected visitIdentifierNode(node: IdentifierNode): EnvVariableValue {
		return this.env.getVariableValueByName(node.value);
	}

	protected visitBooleanNode(node: any): EnvVariableValue {
		return node.value;
	}

	protected visitNumberNode(node: any): EnvVariableValue {
		return node.value;
	}

	protected visitStringNode(node: any): EnvVariableValue {
		return node.value;
	}

	protected visitUnaryExpressionNode(): EnvVariableValue {
		return false;
	}

	protected visitArithmeticExpressionNode(): EnvVariableValue {
		return 0;
	}

	protected visitComparisonExpressionNode(): EnvVariableValue {
		return false;
	}

	protected visitLogicalExpressionNode(): EnvVariableValue {
		return false;
	}

	protected visitAssignStatementNode(): EnvVariableValue {
		return 0;
	}

	protected visitIfControlNode(): EnvVariableValue {
		return 0;
	}

	protected visitTimerBlockNode(): EnvVariableValue {
		return false;
	}

	protected visitTimerStringDeclarationNode(): EnvVariableValue {
		return false;
	}
}

describe("TimerNodeEvaluator", () => {
	let env: Environment;
	let visitor: MockVisitor;
	let evaluator: TimerNodeEvaluator;

	beforeEach(() => {
		const input = new EnvVariable("id_input", "input", "boolean", "IN");
		const lastInput = new EnvVariable("id_lastInput", "lastInput", "boolean", "INOUT");
		const output = new EnvVariable("id_output", "output", "boolean", "OUT");
		const presetTime = new EnvVariable("id_presetTime", "presetTime", "number", "IN");
		const elapsedTime = new EnvVariable("id_elapsedTime", "elapsedTime", "number", "INOUT");

		input.setValue(false);
		lastInput.setValue(false);
		output.setValue(false);
		presetTime.setValue(100);
		elapsedTime.setValue(0);

		env = new Environment([input, lastInput, output, presetTime, elapsedTime]);
		visitor = new MockVisitor(env);
		evaluator = new TimerNodeEvaluator(env, visitor, { deltaTimeMs: 10 });
	});

	const createTimerNode = (type: "TON" | "TOF" | "TP"): TimerNode => {
		return BlocksBuilder.buildTimerNode(
			type,
			IdentifiersBuilder.buildIdentifierNode("input", 0),
			IdentifiersBuilder.buildIdentifierNode("lastInput", 0),
			IdentifiersBuilder.buildIdentifierNode("presetTime", 0),
			IdentifiersBuilder.buildIdentifierNode("elapsedTime", 0),
			IdentifiersBuilder.buildIdentifierNode("output", 0)
		);
	};

	describe("TON (On-Delay Timer)", () => {
		it("starts timing on rising edge", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", true);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false); // Not yet timed out
			expect(env.getVariableValueByName("output")).toBe(false);
			expect(env.getVariableValueByName("lastInput")).toBe(true);
		});

		it("outputs true after preset time", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 100);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(true);
			expect(env.getVariableValueByName("output")).toBe(true);
		});

		it("increments elapsed time while input is true", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 50);
			
			evaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("elapsedTime")).toBe(60);
		});

		it("resets elapsed time when input goes false", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("elapsedTime", 50);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false);
			expect(env.getVariableValueByName("elapsedTime")).toBe(0);
		});

		it("resets output on rising edge", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", false); // Rising edge
			env.setVariableValueByName("output", true); // Was previously true
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false);
			expect(env.getVariableValueByName("output")).toBe(false);
		});
	});

	describe("TOF (Off-Delay Timer)", () => {
		it("sets output true on falling edge", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("lastInput", true); // Falling edge
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(true);
			expect(env.getVariableValueByName("output")).toBe(true);
		});

		it("outputs false after preset time", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("lastInput", false);
			env.setVariableValueByName("elapsedTime", 100);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false);
		});

		it("increments elapsed time while input is false", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("lastInput", false);
			env.setVariableValueByName("elapsedTime", 50);
			
			evaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("elapsedTime")).toBe(60);
		});

		it("resets elapsed time when input goes true", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("elapsedTime", 50);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(true);
			expect(env.getVariableValueByName("elapsedTime")).toBe(0);
		});

		it("maintains output true while input is true", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(true);
		});
	});

	describe("TP (Pulse Timer)", () => {
		it("sets output true on rising edge", () => {
			const timer = createTimerNode("TP");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", false); // Rising edge
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(true);
			expect(env.getVariableValueByName("output")).toBe(true);
		});

		it("outputs false after preset time", () => {
			const timer = createTimerNode("TP");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 100);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false);
		});

		it("increments elapsed time while pulse active", () => {
			const timer = createTimerNode("TP");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 50);
			
			evaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("elapsedTime")).toBe(60);
		});

		it("resets elapsed time when input goes false", () => {
			const timer = createTimerNode("TP");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("elapsedTime", 50);
			
			const result = evaluator.evaluate(timer);
			
			expect(result).toBe(false);
			expect(env.getVariableValueByName("elapsedTime")).toBe(0);
		});

		it("completes pulse even if input stays true", () => {
			const timer = createTimerNode("TP");
			
			// Rising edge
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", false);
			let result = evaluator.evaluate(timer);
			expect(result).toBe(true);
			
			// Continue with input true but elapsedTime < presetTime
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 50);
			result = evaluator.evaluate(timer);
			expect(result).toBe(true);
			
			// After preset time
			env.setVariableValueByName("elapsedTime", 100);
			result = evaluator.evaluate(timer);
			expect(result).toBe(false);
		});
	});

	describe("edge detection", () => {
		it("detects rising edge correctly", () => {
			const timer = createTimerNode("TON");
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", false);
			
			evaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("lastInput")).toBe(true);
		});

		it("detects falling edge correctly", () => {
			const timer = createTimerNode("TOF");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("lastInput", true);
			
			evaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("lastInput")).toBe(false);
		});
	});

	describe("timing accuracy", () => {
		it("uses deltaTimeMs for timing increments", () => {
			const customEvaluator = new TimerNodeEvaluator(env, visitor, { deltaTimeMs: 25 });
			const timer = createTimerNode("TON");
			
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("elapsedTime", 0);
			
			customEvaluator.evaluate(timer);
			
			expect(env.getVariableValueByName("elapsedTime")).toBe(25);
		});
	});
});
