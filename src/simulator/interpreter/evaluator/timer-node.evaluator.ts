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
	 * ET advances by the scan time and is clamped at PT; the cycle that starts a timing (rising
	 * edge of IN for TON and TP, falling edge for TOF) leaves ET at 0.
	 * - TON: Q = ET >= PT, in the same call where ET reaches PT.
	 * - TOF: Q follows IN, then stays true until ET reaches PT after IN fell.
	 * - TP: Q rises with IN (not retriggerable) and falls when ET reaches PT; ET holds PT
	 *   afterwards while IN stays true.
	 * PT <= 0 behaves as PT = 0.
	 */
	evaluate(node: TimerNode): EnvVariableValue {
		const inputValue = this.visitor.visit(node.input) as boolean;
		const lastInputValue = this.visitor.visit(node.lastInput) as boolean;
		const presetTimeValue = this.visitor.visit(node.presetTime) as number;
		const elapsedTimeValue = this.visitor.visit(node.elapsedTime) as number;
		const risingEdge = inputValue && !lastInputValue;
		const fallingEdge = !inputValue && lastInputValue;
		let outputValue: boolean;
		const presetTime = Math.max(presetTimeValue, 0);
		const setElapsed = (value: number) =>
			this.env.setVariableValueByName(
				(node.elapsedTime as IdentifierNode).value,
				value,
			);
		const advanced = () =>
			Math.min(elapsedTimeValue + this.options.deltaTimeMs, presetTime);
		switch (node.timerType) {
			case "TON": {
				if (!inputValue) {
					setElapsed(0);
					outputValue = false;
					break;
				}
				const elapsed = risingEdge ? 0 : advanced();
				setElapsed(elapsed);
				outputValue = elapsed >= presetTime;
				break;
			}
			case "TOF": {
				// The off-delay only runs after IN has been true: Q stays false at startup.
				const delayRunning =
					fallingEdge || (this.visitor.visit(node.output) as boolean);
				if (inputValue || !delayRunning) {
					if (inputValue) setElapsed(0);
					outputValue = inputValue;
					break;
				}
				const elapsed = fallingEdge ? 0 : advanced();
				setElapsed(elapsed);
				outputValue = elapsed < presetTime;
				break;
			}
			case "TP": {
				const pulseRunning = this.visitor.visit(node.output) as boolean;
				if (!pulseRunning && risingEdge) {
					setElapsed(0);
					outputValue = presetTime > 0;
					break;
				}
				if (pulseRunning) {
					const elapsed = advanced();
					setElapsed(elapsed);
					outputValue = elapsed < presetTime;
					break;
				}
				outputValue = false;
				if (!inputValue) setElapsed(0);
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
