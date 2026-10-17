import { pageMetadata } from "@/app/metadata";
import { toLocale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { permanentRedirect } from "next/navigation";
import ManualPage from "../ManualPage";
import { MANUAL_DEFAULT_SECTION, MANUAL_SECTIONS } from "../manual-sections";

type Props = { params: Promise<{ locale: string; section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
	return routing.locales.flatMap((locale) =>
		MANUAL_SECTIONS.map(({ id }) => ({ locale, section: id })),
	);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale, section } = await params;
	if (section === MANUAL_DEFAULT_SECTION) return {};
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	const key = `manualSections.${section}` as "manualSections.projects";
	return pageMetadata(
		locale,
		{ pathname: "/user-manual/[section]", params: { section } },
		t(`${key}.title`),
		t(`${key}.description`),
		{ absoluteTitle: true },
	);
}

export default async function UserManualSection({ params }: Props) {
	const { locale: rawLocale, section } = await params;
	const locale = toLocale(rawLocale);
	if (section === MANUAL_DEFAULT_SECTION)
		permanentRedirect(getPathname({ locale, href: "/user-manual" }));
	setRequestLocale(locale);
	return <ManualPage section={section} />;
}
