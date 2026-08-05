import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { EnvVariableValue } from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";

export type TimerNodeEvaluatorOptions = {
	deltaTimeMs: number;
};

export default class TimerNodeEvaluator {
	private env: Environment;
	private visitor: BaseVisitor<EnvVariableValue>;
	private options: TimerNodeEvaluatorOptions;

	constructor(
		environment: Environment,
		visitor: BaseVisitor<EnvVariableValue>,
		options: TimerNodeEvaluatorOptions,
	) {
		this.env = environment;
		this.visitor = visitor;
		this.options = options;
	}

	/**
	 * @param node
	 * @returns
	 */
	evaluate(node: TimerNode): EnvVariableValue {
		const inputValue = this.visitor.visit(node.input) as boolean;
		const lastInputValue = this.visitor.visit(node.lastInput) as boolean;
		const presetTimeValue = this.visitor.visit(node.presetTime) as number;
		const elapsedTimeValue = this.visitor.visit(node.elapsedTime) as number;
		const risingEdge = inputValue && !lastInputValue;
		const fallingEdge = !inputValue && lastInputValue;
		let outputValue: boolean;
		switch (node.timerType) {
			case "TON":
				if (risingEdge) {
					this.env.setVariableValueByName((node.output as IdentifierNode).value, false);
					outputValue = false;
					break;
				}
				if (inputValue) {
					if (elapsedTimeValue >= presetTimeValue) {
						outputValue = true;
					} else {
						outputValue = false;
						this.env.setVariableValueByName(
							(node.elapsedTime as IdentifierNode).value,
							elapsedTimeValue + this.options.deltaTimeMs,
						);
					}
				} else {
					this.env.setVariableValueByName((node.elapsedTime as IdentifierNode).value, 0);
					outputValue = false;
				}
				break;
			case "TOF":
				if (fallingEdge) {
					this.env.setVariableValueByName((node.output as IdentifierNode).value, true);
					outputValue = true;
					break;
				}
				if (!inputValue) {
					if (elapsedTimeValue >= presetTimeValue) {
						outputValue = false;
					} else {
						outputValue = true;
						this.env.setVariableValueByName(
							(node.elapsedTime as IdentifierNode).value,
							elapsedTimeValue + this.options.deltaTimeMs,
						);
					}
				} else {
					this.env.setVariableValueByName((node.elapsedTime as IdentifierNode).value, 0);
					outputValue = true;
				}
				break;
			case "TP":
				if (risingEdge) {
					this.env.setVariableValueByName((node.output as IdentifierNode).value, true);
					outputValue = true;
					break;
				}
				if (inputValue) {
					if (elapsedTimeValue >= presetTimeValue) {
						outputValue = false;
					} else {
						outputValue = true;
						this.env.setVariableValueByName(
							(node.elapsedTime as IdentifierNode).value,
							elapsedTimeValue + this.options.deltaTimeMs,
						);
					}
				} else {
					this.env.setVariableValueByName((node.elapsedTime as IdentifierNode).value, 0);
					outputValue = false;
				}
				break;
		}
		this.env.setVariableValueByName((node.output as IdentifierNode).value, outputValue);
		this.env.setVariableValueByName((node.lastInput as IdentifierNode).value, inputValue);
		return outputValue;
	}
}
