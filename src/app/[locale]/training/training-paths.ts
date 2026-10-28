import type { Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { trainingStepSlug } from "@/training/step-slugs";
import type { TrainingModuleId } from "@/training/module-ids";

/**
 * URL localisée d'une étape d'un module de formation. La première étape est servie par la page
 * du module (`index` 0), les suivantes par `/training/<module>/<étape>`.
 */
export default function trainingStepPath(
	locale: Locale,
	moduleId: TrainingModuleId,
	stepId: string,
	index: number,
): string {
	const href =
		index === 0
			? `/training/${moduleId}`
			: {
					pathname: `/training/${moduleId}/[step]`,
					params: { step: trainingStepSlug(locale, moduleId, stepId) },
				};
	return getPathname({ locale, href: href as "/" });
}
