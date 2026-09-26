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
 * CTUD counts on `input` (CU) and on `down.input` (CD), the two edges of one cycle cancelling
 * out; `control` (R) takes priority over `down.load` (LD), and `output`/`down.output` are QU
 * (`>= presetValue`) and QD (`<= 0`).
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
		const down = node.down && {
			input: this.visitor.visit(node.down.input) as boolean,
			lastInput: this.visitor.visit(node.down.lastInput) as boolean,
			load: this.visitor.visit(node.down.load) as boolean,
		};

		const risingInput = inputValue && !lastInputValue;
		let nextCurrentValue = currentValueValue;
		if (node.counterType === "CTUD") {
			if (controlValue) nextCurrentValue = 0;
			else if (down!.load) nextCurrentValue = presetValueValue;
			else {
				if (risingInput) nextCurrentValue += 1;
				if (down!.input && !down!.lastInput) nextCurrentValue -= 1;
			}
		} else if (controlValue) {
			nextCurrentValue = node.counterType === "CTU" ? 0 : presetValueValue;
		} else if (risingInput) {
			nextCurrentValue += node.counterType === "CTU" ? 1 : -1;
		}

		const outputValue =
			node.counterType === "CTD"
				? nextCurrentValue <= 0
				: nextCurrentValue >= presetValueValue;

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
		if (node.down && down) {
			this.env.setVariableValueByName(
				(node.down.lastInput as IdentifierNode).value,
				down.input,
			);
			this.env.setVariableValueByName(
				(node.down.output as IdentifierNode).value,
				nextCurrentValue <= 0,
			);
		}
		return outputValue;
	}
}
