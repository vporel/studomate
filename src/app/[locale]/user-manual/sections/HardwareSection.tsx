"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function HardwareSection() {
	const t = useT("manual.hardware");
	return (
		<section id="hardware">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("configTitle")}
			</Typography>
			<Typography mb={2}>{t("configIntro")}</Typography>
			<ManualList items={t.raw("configItems") as string[]} />
			<Typography mb={2}>{t("configBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("actionsTitle")}
			</Typography>
			<Typography mb={2}>{t("actionsIntro")}</Typography>
			<ManualList items={t.raw("actionsItems") as string[]} />
			<Typography mb={2}>{t("actionsOutro")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("modesTitle")}
			</Typography>
			<Typography mb={2}>{t("modesIntro")}</Typography>
			<ManualList items={t.raw("modesItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("observationTitle")}
			</Typography>
			<Typography mb={2}>{t("observationIntro")}</Typography>
			<Typography mb={2}>{t("observationOutro")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("behaviorTitle")}
			</Typography>
			<ManualList items={t.raw("behaviorItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("limitsTitle")}
			</Typography>
			<ManualList items={t.raw("limitsItems") as string[]} />
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
