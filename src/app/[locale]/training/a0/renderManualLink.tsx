import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Typography } from "@mui/material";
import type { TrainingTranslator } from "../training-translator";

export default function renderManualLink(t: TrainingTranslator) {
	return (
		<Box mt={2}>
			<Typography color="text.secondary">
				{t("scanCycleManualLinkPrefix")}{" "}
				<PublicLink href="/user-manual">{t("scanCycleManualLinkLabel")}</PublicLink>.
			</Typography>
		</Box>
	);
}
