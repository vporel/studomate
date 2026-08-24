import CounterNodeEvaluator from "./counter-node.evaluator";
import { Environment } from "@/simulator/interpreter/environment/environment";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";
import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { EnvVariableValue } from "@/simulator/interpreter/environment/env-variable";

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

	protected visitCounterBlockNode(): EnvVariableValue {
		return false;
	}
}

describe("CounterNodeEvaluator", () => {
	let env: Environment;
	let visitor: MockVisitor;
	let evaluator: CounterNodeEvaluator;

	beforeEach(() => {
		const input = new EnvVariable("id_input", "input", "boolean", "IN");
		const control = new EnvVariable("id_control", "control", "boolean", "IN");
		const presetValue = new EnvVariable("id_presetValue", "presetValue", "number", "IN");
		const currentValue = new EnvVariable("id_currentValue", "currentValue", "number", "INOUT");
		const output = new EnvVariable("id_output", "output", "boolean", "OUT");

		input.setValue(false);
		control.setValue(false);
		presetValue.setValue(3);
		currentValue.setValue(0);
		output.setValue(false);

		env = new Environment([input, control, presetValue, currentValue, output]);
		visitor = new MockVisitor(env);
		evaluator = new CounterNodeEvaluator(env, visitor);
	});

	const createCounterNode = (type: "CTU" | "CTD"): CounterNode => {
		return BlocksBuilder.buildCounterNode(
			type,
			IdentifiersBuilder.buildIdentifierNode("input", 0),
			IdentifiersBuilder.buildIdentifierNode("control", 0),
			IdentifiersBuilder.buildIdentifierNode("presetValue", 0),
			IdentifiersBuilder.buildIdentifierNode("currentValue", 0),
			IdentifiersBuilder.buildIdentifierNode("output", 0),
		);
	};

	describe("CTU (compte vers le haut)", () => {
		it("incrémente currentValue tant que input est vrai (niveau, pas front)", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("input", true);

			evaluator.evaluate(counter);
			expect(env.getVariableValueByName("currentValue")).toBe(1);

			evaluator.evaluate(counter);
			expect(env.getVariableValueByName("currentValue")).toBe(2);
		});

		it("n'incrémente pas tant que input est faux", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("input", false);
			env.setVariableValueByName("currentValue", 1);

			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(1);
		});

		it("active output dès que currentValue atteint presetValue", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("currentValue", 2);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(3);
			expect(result).toBe(true);
			expect(env.getVariableValueByName("output")).toBe(true);
		});

		it("continue de compter au-delà de presetValue, sans saturation", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("currentValue", 3);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(4);
			expect(result).toBe(true);
		});

		it("R remet currentValue à 0, prioritaire sur input", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("currentValue", 2);
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("control", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(0);
			expect(result).toBe(false);
		});
	});

	describe("CTD (compte vers le bas)", () => {
		it("décrémente currentValue tant que input est vrai", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 5);
			env.setVariableValueByName("input", true);

			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(4);
		});

		it("LD charge presetValue dans currentValue, prioritaire sur input", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 0);
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("control", true);
			env.setVariableValueByName("presetValue", 5);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(5);
			expect(result).toBe(true);
		});

		it("peut décompter sous zéro, sans saturation", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 0);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(-1);
			expect(result).toBe(false);
		});
	});
});
