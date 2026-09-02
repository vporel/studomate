import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/user-manual",
		t("manualTitle"),
		t("manualDescription"),
	);
}

export default function UserManualLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
