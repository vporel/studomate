import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { EnvVariableValue } from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";

/**
 * `input`/`control` sont évalués en niveau, pas en front : tant que `control` (R pour CTU, LD
 * pour CTD) est vrai, `currentValue` est figé à sa valeur cible chaque cycle, prioritaire sur
 * `input` — sinon `currentValue` change d'une unité par cycle tant que `input` (CU/CD) reste
 * vrai, sans saturation à `presetValue` (continue au-delà). `output` (Q) vaut
 * `currentValue >= presetValue`, même règle pour CTU et CTD.
 */
export default class CounterNodeEvaluator {
	private env: Environment;
	private visitor: BaseVisitor<EnvVariableValue>;

	constructor(
		environment: Environment,
		visitor: BaseVisitor<EnvVariableValue>,
	) {
		this.env = environment;
		this.visitor = visitor;
	}

	setEnvironment(environment: Environment): void {
		this.env = environment;
	}

	evaluate(node: CounterNode): EnvVariableValue {
		const inputValue = this.visitor.visit(node.input) as boolean;
		const controlValue = this.visitor.visit(node.control) as boolean;
		const presetValueValue = this.visitor.visit(node.presetValue) as number;
		const currentValueValue = this.visitor.visit(node.currentValue) as number;

		let nextCurrentValue: number;
		if (controlValue) {
			nextCurrentValue = node.counterType === "CTU" ? 0 : presetValueValue;
		} else if (inputValue) {
			nextCurrentValue =
				node.counterType === "CTU"
					? currentValueValue + 1
					: currentValueValue - 1;
		} else {
			nextCurrentValue = currentValueValue;
		}

		const outputValue = nextCurrentValue >= presetValueValue;

		this.env.setVariableValueByName(
			(node.currentValue as IdentifierNode).value,
			nextCurrentValue,
		);
		this.env.setVariableValueByName(
			(node.output as IdentifierNode).value,
			outputValue,
		);
		return outputValue;
	}
}
