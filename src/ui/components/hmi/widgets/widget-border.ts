export const WIDGET_SELECTED_COLOR = "#1976d2";
export const WIDGET_BORDER_COLOR = "#555";

export default function widgetBorder(selected: boolean | undefined): string {
	return `2px solid ${selected ? WIDGET_SELECTED_COLOR : WIDGET_BORDER_COLOR}`;
}
