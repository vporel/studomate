import type { EditorTourKind } from "@/persistence/preferences.storage";
import buildTourSteps from "@/ui/components/product-tour/engine/build-tour-steps";
import type { TourStep } from "@/ui/components/product-tour/engine/start-tour";
import type { TourTranslator } from "@/ui/components/product-tour/engine/useStartTour";

/** Steps of each editor tour, in display order, under `editors.<kind>.steps` of the messages. */
export const EDITOR_TOUR_STEP_IDS: Record<EditorTourKind, readonly string[]> = {
	grafcet: ["toolbar", "canvas"],
	ladder: ["toolbar", "systemBlocks", "addSection", "canvas"],
	hmi: ["toolbar", "canvas", "properties"],
};

const EDITOR_TOUR_STEP_BUILDERS = Object.fromEntries(
	Object.entries(EDITOR_TOUR_STEP_IDS).map(([kind, ids]) => [
		kind,
		(t: TourTranslator) => buildTourSteps(ids, `editors.${kind}.steps`, t),
	]),
) as Record<EditorTourKind, (t: TourTranslator) => TourStep[]>;

export default EDITOR_TOUR_STEP_BUILDERS;

export function isEditorTourKind(value: unknown): value is EditorTourKind {
	return (
		typeof value === "string" && Object.hasOwn(EDITOR_TOUR_STEP_BUILDERS, value)
	);
}
