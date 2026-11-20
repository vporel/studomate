import type { Locale } from "@/i18n/config";
import { usePathname } from "@/i18n/navigation";
import { manualIdFromSlug, manualSlug } from "@/i18n/manual-slugs";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import {
	trainingStepIdFromSlug,
	trainingStepSlug,
} from "@/training/step-slugs";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

const trainingModuleSteps = (moduleId: string) =>
	TRAINING_MODULE_STEP_IDS.find((m) => m.moduleId === moduleId);

/**
 * Href of the current public page in another language: the translated slug of a manual section
 * or training step is resolved for the target language. If the route is dynamic but its
 * parameters are missing (unknown slug), it falls back to the home page.
 */
export default function usePublicPageHref(
	pathname?: ReturnType<typeof usePathname>,
) {
	const currentPathname = usePathname();
	const target = pathname ?? currentPathname;
	const params = useParams();
	const paramNames = Array.from(target.matchAll(/\[(\w+)\]/g), (m) => m[1]);
	const hasAllParams = paramNames.every((name) => name in params);
	const current = useLocale() as Locale;
	return (locale: Locale) => {
		if (paramNames.length === 0) return target as "/";
		if (!hasAllParams) return "/";
		if (target === "/user-manual/[section]") {
			const id = manualIdFromSlug(current, params.section as string);
			if (!id) return "/";
			return {
				pathname: target,
				params: { ...params, section: manualSlug(locale, id) },
			} as unknown as "/";
		}
		const trainingModule = trainingModuleSteps(
			/^\/training\/(a\d)\/\[step\]$/.exec(target)?.[1] ?? "",
		);
		if (trainingModule) {
			const id = trainingStepIdFromSlug(
				current,
				trainingModule.moduleId,
				params.step as string,
				trainingModule.stepIds,
			);
			if (!id) return "/";
			return {
				pathname: target,
				params: {
					...params,
					step: trainingStepSlug(locale, trainingModule.moduleId, id),
				},
			} as unknown as "/";
		}
		return { pathname: target, params } as unknown as "/";
	};
}
