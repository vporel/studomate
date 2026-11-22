import type { Locale } from "@/i18n/config";
import { usePathname } from "@/i18n/navigation";
import { manualIdFromSlug, manualSlug } from "@/i18n/manual-slugs";
import { routing } from "@/i18n/routing";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import {
	trainingStepIdFromSlug,
	trainingStepSlug,
} from "@/training/step-slugs";
import { useLocale } from "next-intl";
import { useParams, usePathname as useBrowserPathname } from "next/navigation";

const trainingModuleSteps = (moduleId: string) =>
	TRAINING_MODULE_STEP_IDS.find((m) => m.moduleId === moduleId);

/**
 * Dynamic segments of `internalPathname` read from the address shown in the browser, which
 * follows `history.replaceState` (step switches inside a training module) while `useParams()`
 * keeps the parameters of the last router navigation.
 */
function paramsFromBrowserPath(
	browserPath: string | null,
	locale: Locale,
	internalPathname: string,
): Record<string, string> {
	const localized = (
		routing.pathnames as Record<string, string | Record<string, string>>
	)[internalPathname];
	const template =
		typeof localized === "string" ? localized : localized?.[locale];
	if (!browserPath || !template) return {};
	const names = Array.from(template.matchAll(/\[(\w+)\]/g), (m) => m[1]);
	if (names.length === 0) return {};
	const prefix = `/${locale}`;
	const path =
		browserPath === prefix || browserPath.startsWith(`${prefix}/`)
			? browserPath.slice(prefix.length)
			: browserPath;
	const pattern = template
		.split(/\[\w+\]/)
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("([^/]+)");
	const match = new RegExp(`^${pattern}/?$`).exec(path);
	if (!match) return {};
	return Object.fromEntries(
		names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
	);
}

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
	const routerParams = useParams();
	const browserPath = useBrowserPathname();
	const current = useLocale() as Locale;
	const params = {
		...routerParams,
		...(pathname === undefined || pathname === currentPathname
			? paramsFromBrowserPath(browserPath, current, target)
			: {}),
	};
	const paramNames = Array.from(target.matchAll(/\[(\w+)\]/g), (m) => m[1]);
	const hasAllParams = paramNames.every((name) => name in params);
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
