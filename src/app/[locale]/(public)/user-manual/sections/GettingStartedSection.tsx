"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function GettingStartedSection() {
	const t = useT("manual.gettingStarted");
	return (
		<section id="getting-started">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>

			<Typography variant="h4" mb={2}>
				{t("newProjectTitle")}
			</Typography>
			<Typography mb={2}>{t("newProjectIntro")}</Typography>
			<ManualList items={t.raw("newProjectItems") as string[]} />
			<Typography mb={2}>{t("newProjectOutro")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("openTitle")}
			</Typography>
			<Typography mb={2}>{t("openBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("saveTitle")}
			</Typography>
			<Typography mb={2}>{t("saveBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("interfaceTitle")}
			</Typography>
			<Typography mb={1}>{t("interfaceIntro")}</Typography>
			<ManualList items={t.raw("interfaceItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("helpMenuTitle")}
			</Typography>
			<Typography mb={2}>{t("helpMenuBody")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
