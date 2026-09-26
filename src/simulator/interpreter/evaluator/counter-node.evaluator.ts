import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { EnvVariableValue } from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";

/**
 * `input` (CU/CD) counts on its rising edge, detected against `lastInput`; `control` (R for CTU,
 * LD for CTD) is evaluated on level: while true, `currentValue` is held at its target value every
 * cycle, with priority over `input`. Otherwise `currentValue` moves by one unit per rising edge of
 * `input`, without saturating (CTU keeps counting past `presetValue`, CTD below zero). `output`
 * (Q) follows IEC 61131-3: `currentValue >= presetValue` for CTU, `currentValue <= 0` for CTD.
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
		const lastInputValue = this.visitor.visit(node.lastInput) as boolean;
		const controlValue = this.visitor.visit(node.control) as boolean;
		const presetValueValue = this.visitor.visit(node.presetValue) as number;
		const currentValueValue = this.visitor.visit(node.currentValue) as number;

		let nextCurrentValue: number;
		if (controlValue) {
			nextCurrentValue = node.counterType === "CTU" ? 0 : presetValueValue;
		} else if (inputValue && !lastInputValue) {
			nextCurrentValue =
				node.counterType === "CTU"
					? currentValueValue + 1
					: currentValueValue - 1;
		} else {
			nextCurrentValue = currentValueValue;
		}

		const outputValue =
			node.counterType === "CTU"
				? nextCurrentValue >= presetValueValue
				: nextCurrentValue <= 0;

		this.env.setVariableValueByName(
			(node.lastInput as IdentifierNode).value,
			inputValue,
		);
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
