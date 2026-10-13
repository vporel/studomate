/** True when a keyboard event comes from a field the user types in (input, textarea, editable content). */
export default function isTextEntryTarget(
	target: EventTarget | null | undefined,
): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable === true
	);
}
