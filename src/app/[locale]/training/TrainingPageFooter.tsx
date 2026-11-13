import { toLocale } from "@/i18n/config";
import { manualSlug } from "@/i18n/manual-slugs";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Divider, Stack } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import type { TrainingManualSection } from "./training-modules";

const MANUAL_LINK_KEYS = {
	grafcet: "manualLinkGrafcet",
	ladder: "manualLinkLadder",
} as const;

export default function TrainingPageFooter({
	manualSections = [],
}: {
	manualSections?: TrainingManualSection[];
}) {
	const t = useTranslations("training");
	const locale = toLocale(useLocale());

	return (
		<>
			<Divider sx={{ my: 4 }} />
			<Stack direction="row" gap={2} flexWrap="wrap">
				<PublicLink href="/training">{t("backToTraining")}</PublicLink>
				{manualSections.map((section) => (
					<PublicLink
						key={section}
						href={{
							pathname: "/user-manual/[section]",
							params: { section: manualSlug(locale, section) },
						}}
					>
						{t(MANUAL_LINK_KEYS[section])}
					</PublicLink>
				))}
				<PublicLink href="/">{t("backHome")}</PublicLink>
			</Stack>
		</>
	);
}
