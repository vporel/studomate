import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Typography } from "@mui/material";
import type { TrainingTranslator } from "./training-translator";

export default function renderGlossaryLink(t: TrainingTranslator) {
	return (
		<Box mt={2}>
			<Typography color="text.secondary">
				{t("glossaryLinkPrefix")}{" "}
				<PublicLink href="/training/glossary">
					{t("glossaryLinkLabel")}
				</PublicLink>
				.
			</Typography>
		</Box>
	);
}
