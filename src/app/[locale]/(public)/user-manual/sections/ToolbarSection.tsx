"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function ToolbarSection() {
	const t = useT("manual.toolbar");
	return (
		<section id="toolbar">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("generalTitle")}
			</Typography>
			<ManualList items={t.raw("generalItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("nameTitle")}
			</Typography>
			<Typography mb={2}>{t("nameBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("analysisTitle")}
			</Typography>
			<ManualList items={t.raw("analysisItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("grafcetToolsTitle")}
			</Typography>
			<Typography mb={2}>{t("grafcetToolsIntro")}</Typography>
			<ManualList items={t.raw("grafcetTools") as string[]} />
			<Typography mb={2}>{t("grafcetToolsZoom")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("ladderToolsTitle")}
			</Typography>
			<Typography mb={2}>{t("ladderToolsIntro")}</Typography>
			<ManualList items={t.raw("ladderTools") as string[]} />
			<Typography mb={2}>{t("ladderToolsOutro")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
