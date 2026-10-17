import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Divider, Stack } from "@mui/material";
import { useTranslations } from "next-intl";

export default function TrainingPageFooter() {
	const t = useTranslations("training");

	return (
		<>
			<Divider sx={{ my: 4 }} />
			<Stack direction="row" gap={2} flexWrap="wrap">
				<PublicLink href="/training">{t("backToTraining")}</PublicLink>
				<PublicLink href="/">{t("backHome")}</PublicLink>
			</Stack>
		</>
	);
}
