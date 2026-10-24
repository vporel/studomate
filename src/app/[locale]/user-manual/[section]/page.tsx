import { pageMetadata } from "@/app/metadata";
import { toLocale } from "@/i18n/config";
import { manualIdFromSlug, manualSlug } from "@/i18n/manual-slugs";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import ClientMessagesProvider from "@/app/[locale]/ClientMessagesProvider";
import ManualPage from "../ManualPage";
import manualSectionHref from "../manual-section-href";
import {
	MANUAL_CLIENT_NAMESPACES,
	MANUAL_DEFAULT_SECTION,
	MANUAL_SECTIONS,
} from "../manual-sections";

type Props = { params: Promise<{ locale: string; section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
	return routing.locales.flatMap((locale) =>
		MANUAL_SECTIONS.filter(({ id }) => id !== MANUAL_DEFAULT_SECTION).map(
			({ id }) => ({ locale, section: manualSlug(locale, id) }),
		),
	);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale, section: slug } = await params;
	const locale = toLocale(rawLocale);
	const section = manualIdFromSlug(locale, slug);
	if (!section) return {};
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	const key = `manualSections.${section}` as "manualSections.projects";
	return pageMetadata(
		locale,
		manualSectionHref(section),
		t(`${key}.title`),
		t(`${key}.description`),
		{ absoluteTitle: true },
	);
}

export default async function UserManualSection({ params }: Props) {
	const { locale: rawLocale, section: slug } = await params;
	const locale = toLocale(rawLocale);
	const section = manualIdFromSlug(locale, slug);
	if (!section) notFound();
	setRequestLocale(locale);
	return (
		<ClientMessagesProvider namespaces={MANUAL_CLIENT_NAMESPACES}>
			<ManualPage section={section} />
		</ClientMessagesProvider>
	);
}
