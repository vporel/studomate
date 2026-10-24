import buildBreadcrumbJsonLd, {
	type BreadcrumbAncestor,
	type BreadcrumbCurrent,
} from "@/app/[locale]/breadcrumbJsonLd";
import type { Locale } from "@/i18n/config";
import { Breadcrumbs, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import PublicLink from "./PublicLink";

/**
 * Breadcrumb trail of a public page and its `BreadcrumbList` JSON-LD: ancestors are links, the
 * current page (when given) is plain text.
 */
export default async function PublicBreadcrumbs({
	locale,
	ancestors,
	current,
}: {
	locale: Locale;
	ancestors: BreadcrumbAncestor[];
	current?: BreadcrumbCurrent;
}) {
	const t = await getTranslations({ locale, namespace: "public.breadcrumb" });

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: buildBreadcrumbJsonLd(locale, ancestors, current),
				}}
			/>
			<Breadcrumbs aria-label={t("label")} sx={{ mb: 2 }}>
				{ancestors.map(({ label, href }) => (
					<PublicLink key={href} href={href}>
						{label}
					</PublicLink>
				))}
				{current && (
					<Typography color="text.primary" aria-current="page">
						{current.label}
					</Typography>
				)}
			</Breadcrumbs>
		</>
	);
}
