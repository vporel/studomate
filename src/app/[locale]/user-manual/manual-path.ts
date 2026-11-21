import type { Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { MANUAL_DEFAULT_SECTION, resolveManualTarget } from "./manual-sections";
import manualSectionHref from "./manual-section-href";

/** URL localisée d'une entrée du plan (section de premier niveau ou ancre de sous-section). */
export default function manualPath(locale: Locale, id: string): string | null {
	const target = resolveManualTarget(id);
	if (!target) return null;
	const path =
		target.section === MANUAL_DEFAULT_SECTION
			? getPathname({ locale, href: "/user-manual" })
			: getPathname({
					locale,
					href: manualSectionHref(target.section)(locale),
				});
	return target.hash ? `${path}#${target.hash}` : path;
}
