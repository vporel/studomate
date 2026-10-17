import { NumericRange } from "@/lib/numeric-range";
import type { VariableType, VariableZone } from "./variable.schema";

/**
 * Physical behavior of an input (the device wired to it). Applies in simulation: rest value at
 * start-up, bounds of a slider. `NO`/`NC`: normally open / normally closed contact.
 */
export type InputBehavior =
	| { kind: "push-button-no"; params: null }
	| { kind: "push-button-nc"; params: null }
	| { kind: "toggle-switch-no"; params: null }
	| { kind: "toggle-switch-nc"; params: null }
	| { kind: "slider"; params: SliderParams };

export type SliderParams = { min: number; max: number };

export type InputBehaviorKind = InputBehavior["kind"];

export const PUSH_BUTTON_KINDS = ["push-button-no", "push-button-nc"] as const;
export const TOGGLE_SWITCH_KINDS = [
	"toggle-switch-no",
	"toggle-switch-nc",
] as const;

const BOOLEAN_INPUT_BEHAVIOR_KINDS: InputBehaviorKind[] = [
	...PUSH_BUTTON_KINDS,
	...TOGGLE_SWITCH_KINDS,
];

const SLIDER_TYPES: VariableType[] = ["INT", "WORD", "DWORD"];

export const DEFAULT_SLIDER_PARAMS: SliderParams = { min: 0, max: 100 };

export const PUSH_BUTTON_NO_BEHAVIOR: InputBehavior = {
	kind: "push-button-no",
	params: null,
};

export const TOGGLE_SWITCH_NO_BEHAVIOR: InputBehavior = {
	kind: "toggle-switch-no",
	params: null,
};

export const DEFAULT_LOGIC_INPUT_BEHAVIOR = PUSH_BUTTON_NO_BEHAVIOR;

export function getAllowedInputBehaviorKinds(
	zone: VariableZone,
	type: VariableType,
): InputBehaviorKind[] {
	if (zone === "logic-input" && type === "BOOL")
		return BOOLEAN_INPUT_BEHAVIOR_KINDS;
	if (zone === "analog-input" && SLIDER_TYPES.includes(type)) return ["slider"];
	return [];
}

export function isPushButtonBehavior(
	behavior: InputBehavior | null | undefined,
): boolean {
	return (
		!!behavior &&
		(PUSH_BUTTON_KINDS as readonly InputBehaviorKind[]).includes(behavior.kind)
	);
}

export function isToggleSwitchBehavior(
	behavior: InputBehavior | null | undefined,
): boolean {
	return (
		!!behavior &&
		(TOGGLE_SWITCH_KINDS as readonly InputBehaviorKind[]).includes(
			behavior.kind,
		)
	);
}

export function isNormallyClosed(
	behavior: InputBehavior | null | undefined,
): boolean {
	return (
		behavior?.kind === "push-button-nc" || behavior?.kind === "toggle-switch-nc"
	);
}

/**
 * Value of the input while the operator does not act on the device: `true` for a normally
 * closed contact, `0` for a slider whose range contains it (its `min` otherwise). `undefined`
 * when no behavior is defined.
 */
export function getInputRestValue(
	behavior: InputBehavior | null | undefined,
): boolean | number | undefined {
	if (!behavior) return undefined;
	if (behavior.kind === "slider") {
		const { min, max } = behavior.params;
		return min <= 0 && 0 <= max ? 0 : min;
	}
	return isNormallyClosed(behavior);
}

/** Saturating range enforced on a slider input: any written value is brought back to a bound. */
export function getSliderRange(
	behavior: InputBehavior | null | undefined,
): NumericRange | null {
	if (behavior?.kind !== "slider") return null;
	return {
		min: behavior.params.min,
		max: behavior.params.max,
		integer: true,
		wrap: false,
	};
}
