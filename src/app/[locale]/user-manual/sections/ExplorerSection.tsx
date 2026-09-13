"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function ExplorerSection() {
	const t = useT("manual.explorer");
	return (
		<section id="explorer">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("structureTitle")}
			</Typography>
			<Typography mb={1}>{t("structureIntro")}</Typography>

			<Typography mb={1}>{t("variablesLabel")}</Typography>
			<ManualList items={t.raw("variablesItems") as string[]} />
			<Typography mb={1}>{t("programsLabel")}</Typography>
			<ManualList items={t.raw("programsItems") as string[]} />
			<Typography mb={1}>{t("blockInstancesLabel")}</Typography>
			<ManualList items={t.raw("blockInstancesItems") as string[]} />
			<Typography mb={1}>{t("systemBlocksLabel")}</Typography>
			<ManualList items={t.raw("systemBlocksItems") as string[]} />
			<Typography mb={1}>{t("hmiLabel")}</Typography>
			<ManualList items={t.raw("hmiItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("actionsTitle")}
			</Typography>
			<ManualList items={t.raw("actionsItems") as string[]} />
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
