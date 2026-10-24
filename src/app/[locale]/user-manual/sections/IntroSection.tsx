"use client";

import { useT } from "@/ui/i18n/useT";
import { ManualH2, ManualH3 } from "../manual-heading";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function IntroSection() {
	const t = useT("manual.intro");
	return (
		<section id="intro">
			<Typography variant="h2" component={ManualH2} mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Typography mb={2}>{t("p2")}</Typography>
			<ManualList items={t.raw("features") as string[]} />
			<Typography mb={2}>{t("p3")}</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" component={ManualH3} mb={2}>
				{t("landmarksTitle")}
			</Typography>
			<Typography mb={1}>{t("landmarksIntro")}</Typography>
			<ManualList items={t.raw("landmarks") as string[]} />
			<Typography mb={2}>{t("readingOrder")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
