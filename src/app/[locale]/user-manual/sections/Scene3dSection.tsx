"use client";

import { useT } from "@/ui/i18n/useT";
import { ManualH2, ManualH3 } from "../manual-heading";
import { Divider, Typography } from "@mui/material";
import { ManualFigure, ManualList } from "./manual-ui";

export default function Scene3dSection() {
	const t = useT("manual.scene3d");
	return (
		<section id="scene3d">
			<Typography variant="h2" component={ManualH2} mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<ManualFigure
				src="/user-manual/scene-3d/scene-3d-1.png"
				alt={t("cartonSortingFigureAlt")}
				width={900}
			/>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" component={ManualH3} mb={2}>
				{t("scenesTitle")}
			</Typography>
			<Typography mb={2}>{t("scenesIntro")}</Typography>
			<ManualList items={t.raw("scenesItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" component={ManualH3} mb={2}>
				{t("configTitle")}
			</Typography>
			<Typography mb={2}>{t("configIntro")}</Typography>
			<ManualList items={t.raw("configItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" component={ManualH3} mb={2}>
				{t("openTitle")}
			</Typography>
			<Typography mb={2}>{t("openBody")}</Typography>
			<ManualList items={t.raw("openItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" component={ManualH3} mb={2}>
				{t("limitsTitle")}
			</Typography>
			<ManualList items={t.raw("limitsItems") as string[]} />
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
