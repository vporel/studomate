"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function CrossReferencesSection() {
	const t = useT("manual.crossReferences");
	return (
		<section id="cross-references">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("openTitle")}
			</Typography>
			<Typography mb={2}>{t("openBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("panelTitle")}
			</Typography>
			<Typography mb={2}>{t("panelIntro")}</Typography>
			<ManualList items={t.raw("panelItems") as string[]} />
			<Typography mb={2}>{t("panelOutro")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("quickTitle")}
			</Typography>
			<Typography mb={2}>{t("quickBody")}</Typography>
			<Typography mb={2}>{t("scopeBody")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
