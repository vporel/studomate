import {
	InputBehavior,
	InputBehaviorKind,
	PUSH_BUTTON_KINDS,
	TOGGLE_SWITCH_KINDS,
} from "@/schemas/variable/input-behavior";
import {
	HmiWidget,
	HmiWidgetType,
	NumericInputData,
	PushButtonData,
	ToggleSwitchData,
} from "./hmi-widget.schema";

/**
 * Widget data fields imposed by the behavior of the bound input, or `null` when the widget stays
 * free (no behavior, or a behavior that does not concern this widget type). These fields cannot
 * be edited while the binding lasts, and take precedence over the stored data at run time.
 */
export function getBehaviorImposedData(
	widgetType: HmiWidgetType,
	behavior: InputBehavior | null | undefined,
): Partial<PushButtonData & ToggleSwitchData & NumericInputData> | null {
	if (!behavior) return null;
	if (widgetType === "push-button") {
		if (behavior.kind === "push-button-no") return { behavior: "momentary-no" };
		if (behavior.kind === "push-button-nc") return { behavior: "momentary-nc" };
	}
	if (widgetType === "toggle-switch") {
		if (behavior.kind === "toggle-switch-no") return { contact: "no" };
		if (behavior.kind === "toggle-switch-nc") return { contact: "nc" };
	}
	if (
		(widgetType === "numeric-input" || widgetType === "slider") &&
		behavior.kind === "slider"
	) {
		return { min: behavior.params.min, max: behavior.params.max };
	}
	return null;
}

/** `widget.data` with the fields imposed by the bound input's behavior applied. */
export function withBehaviorImposedData<W extends HmiWidget>(
	widget: W,
	behavior: InputBehavior | null | undefined,
): W["data"] {
	const imposed = getBehaviorImposedData(widget.type, behavior);
	return imposed ? { ...widget.data, ...imposed } : widget.data;
}

const NO_KINDS: readonly InputBehaviorKind[] = [];

/** Input behaviors that a widget type cannot drive: a push-button cannot act as a toggle-switch
 * and vice versa. Their variables are left out of the widget's variable selector. */
export function getExcludedBehaviorKinds(
	widgetType: HmiWidgetType,
): readonly InputBehaviorKind[] {
	if (widgetType === "push-button") return TOGGLE_SWITCH_KINDS;
	if (widgetType === "toggle-switch") return PUSH_BUTTON_KINDS;
	return NO_KINDS;
}
