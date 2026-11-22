import {
	HMI_WIDGET_DEFINITIONS,
	type HmiWidgetData,
	type HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";

/** Translator scoped to `hmiEditor`. */
export type HmiEditorTranslator = (key: string) => string;

/**
 * What a widget created from the palette gets in the interface language: the base of its name
 * ("Push button" gives "Push button_1") and the text it shows (`label`, or `text` for a text
 * widget). Shapes show no text.
 */
export default function localizedWidgetDefaults(
	type: HmiWidgetType,
	t: HmiEditorTranslator,
): { nameBase: string; data: Partial<HmiWidgetData> } {
	const nameBase = t(`widgetNames.${type}`);
	const defaults = HMI_WIDGET_DEFINITIONS[type].defaultData;
	if ("label" in defaults)
		return { nameBase, data: { label: t(`defaultLabels.${type}`) } };
	if ("text" in defaults)
		return { nameBase, data: { text: t(`defaultLabels.${type}`) } };
	return { nameBase, data: {} };
}
