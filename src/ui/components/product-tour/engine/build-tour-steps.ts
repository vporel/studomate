import type { TourStep } from "./start-tour";
import type { TourTranslator } from "./useStartTour";

/**
 * One step per id, in order, titled and described by `<keyPrefix>.<id>.title` and
 * `<keyPrefix>.<id>.description` of the `tour` messages. The keys are not checked by the
 * compiler: each tour has a test that its ids have both texts in every locale.
 */
export default function buildTourSteps(
	ids: readonly string[],
	keyPrefix: string,
	t: TourTranslator,
): TourStep[] {
	const translate = t as unknown as (key: string) => string;
	return ids.map((id) => ({
		id,
		title: translate(`${keyPrefix}.${id}.title`),
		description: translate(`${keyPrefix}.${id}.description`),
	}));
}
