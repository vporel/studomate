"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function VariablesSection() {
	const t = useT("manual.variables");
	return (
		<section id="variables">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("zonesTitle")}
			</Typography>
			<ManualList items={t.raw("zonesItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("typesTitle")}
			</Typography>
			<ManualList items={t.raw("typesItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("propertiesTitle")}
			</Typography>
			<ManualList items={t.raw("propertiesItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("managementTitle")}
			</Typography>
			<Typography mb={2}>{t("managementBody1")}</Typography>
			<Typography mb={2}>{t("managementBody2")}</Typography>
			<Typography mb={2}>{t("managementBody3")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
