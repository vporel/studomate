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

	setEnvironment(environment: Environment): void {
		this.env = environment;
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
					this.env.setVariableValueByName(
						(node.output as IdentifierNode).value,
						false,
					);
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
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						0,
					);
					outputValue = false;
				}
				break;
			case "TOF": {
				if (inputValue) {
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						0,
					);
					outputValue = true;
					break;
				}
				if (fallingEdge) {
					outputValue = true;
					break;
				}
				// The off-delay only runs after IN has been true: Q stays false at startup.
				const delayRunning = this.visitor.visit(node.output) as boolean;
				if (delayRunning && elapsedTimeValue < presetTimeValue) {
					outputValue = true;
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						elapsedTimeValue + this.options.deltaTimeMs,
					);
				} else {
					outputValue = false;
				}
				break;
			}
			case "TP": {
				// IEC 61131-3: once started, the pulse lasts PT whatever IN does, and a rising edge
				// during the pulse is ignored (not retriggerable). ET holds PT after the pulse
				// while IN stays true.
				const pulseRunning = this.visitor.visit(node.output) as boolean;
				if (!pulseRunning && risingEdge) {
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						0,
					);
					outputValue = true;
					break;
				}
				if (pulseRunning && elapsedTimeValue < presetTimeValue) {
					outputValue = true;
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						elapsedTimeValue + this.options.deltaTimeMs,
					);
					break;
				}
				outputValue = false;
				if (!inputValue) {
					this.env.setVariableValueByName(
						(node.elapsedTime as IdentifierNode).value,
						0,
					);
				}
				break;
			}
		}
		this.env.setVariableValueByName(
			(node.output as IdentifierNode).value,
			outputValue,
		);
		this.env.setVariableValueByName(
			(node.lastInput as IdentifierNode).value,
			inputValue,
		);
		return outputValue;
	}
}
