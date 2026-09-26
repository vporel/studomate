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
		const lastInput = new EnvVariable(
			"id_lastInput",
			"lastInput",
			"boolean",
			"INOUT",
		);
		const control = new EnvVariable("id_control", "control", "boolean", "IN");
		const presetValue = new EnvVariable(
			"id_presetValue",
			"presetValue",
			"number",
			"IN",
		);
		const currentValue = new EnvVariable(
			"id_currentValue",
			"currentValue",
			"number",
			"INOUT",
		);
		const output = new EnvVariable("id_output", "output", "boolean", "OUT");

		input.setValue(false);
		lastInput.setValue(false);
		control.setValue(false);
		presetValue.setValue(3);
		currentValue.setValue(0);
		output.setValue(false);

		env = new Environment([
			input,
			lastInput,
			control,
			presetValue,
			currentValue,
			output,
		]);
		visitor = new MockVisitor(env);
		evaluator = new CounterNodeEvaluator(env, visitor);
	});

	const createCounterNode = (type: "CTU" | "CTD"): CounterNode => {
		return BlocksBuilder.buildCounterNode(
			type,
			IdentifiersBuilder.buildIdentifierNode("input", 0),
			IdentifiersBuilder.buildIdentifierNode("lastInput", 0),
			IdentifiersBuilder.buildIdentifierNode("control", 0),
			IdentifiersBuilder.buildIdentifierNode("presetValue", 0),
			IdentifiersBuilder.buildIdentifierNode("currentValue", 0),
			IdentifiersBuilder.buildIdentifierNode("output", 0),
		);
	};

	describe("détection de front sur input", () => {
		it("compte une seule unité quand input reste vrai plusieurs cycles", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("input", true);

			evaluator.evaluate(counter);
			evaluator.evaluate(counter);
			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(1);
		});

		it("compte une unité de plus à chaque nouveau front montant", () => {
			const counter = createCounterNode("CTU");

			for (let i = 0; i < 2; i++) {
				env.setVariableValueByName("input", true);
				evaluator.evaluate(counter);
				env.setVariableValueByName("input", false);
				evaluator.evaluate(counter);
			}

			expect(env.getVariableValueByName("currentValue")).toBe(2);
		});

		it("ne compte pas sur le front descendant", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("lastInput", true);
			env.setVariableValueByName("input", false);

			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(0);
		});

		it("mémorise input dans lastInput à chaque cycle", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("input", true);
			evaluator.evaluate(counter);
			expect(env.getVariableValueByName("lastInput")).toBe(true);

			env.setVariableValueByName("input", false);
			evaluator.evaluate(counter);
			expect(env.getVariableValueByName("lastInput")).toBe(false);
		});

		it("un front survenu pendant control n'est pas compté après le relâchement de control", () => {
			const counter = createCounterNode("CTU");
			env.setVariableValueByName("control", true);
			env.setVariableValueByName("input", true);
			evaluator.evaluate(counter);

			env.setVariableValueByName("control", false);
			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(0);
		});
	});

	describe("CTU (compte vers le haut)", () => {
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

		it("R remet currentValue à 0, prioritaire sur un front de input", () => {
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
		it("décrémente currentValue sur front montant de input", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 5);
			env.setVariableValueByName("input", true);

			evaluator.evaluate(counter);
			evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(4);
		});

		it("LD charge presetValue dans currentValue, prioritaire sur un front de input", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 0);
			env.setVariableValueByName("input", true);
			env.setVariableValueByName("control", true);
			env.setVariableValueByName("presetValue", 5);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(5);
			expect(result).toBe(false);
		});

		it("peut décompter sous zéro, sans saturation", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 0);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(-1);
			expect(result).toBe(true);
		});

		it("Q reste faux tant que currentValue est au-dessus de zéro, même au-dessus de presetValue", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("presetValue", 3);
			env.setVariableValueByName("currentValue", 10);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(9);
			expect(result).toBe(false);
			expect(env.getVariableValueByName("output")).toBe(false);
		});

		it("active Q dès que currentValue atteint zéro", () => {
			const counter = createCounterNode("CTD");
			env.setVariableValueByName("currentValue", 1);
			env.setVariableValueByName("input", true);

			const result = evaluator.evaluate(counter);

			expect(env.getVariableValueByName("currentValue")).toBe(0);
			expect(result).toBe(true);
			expect(env.getVariableValueByName("output")).toBe(true);
		});
	});
});
