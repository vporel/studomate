import { manualSlug } from "@/i18n/manual-slugs";
import type { LocalizedHref } from "@/app/metadata";

/** Address of a top-level manual section page, with the slug of each locale. */
export default function manualSectionHref(id: string): LocalizedHref {
	return (locale) => ({
		pathname: "/user-manual/[section]",
		params: { section: manualSlug(locale, id) },
	});
}
