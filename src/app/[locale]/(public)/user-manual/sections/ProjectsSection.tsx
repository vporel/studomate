"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function ProjectsSection() {
	const t = useT("manual.projects");
	return (
		<section id="projects">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("createTitle")}
			</Typography>
			<Typography mb={2}>{t("createIntro")}</Typography>
			<ManualList items={t.raw("createItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("openTitle")}
			</Typography>
			<Typography mb={2}>{t("openBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("saveTitle")}
			</Typography>
			<Typography mb={2}>{t("saveBody1")}</Typography>
			<Typography mb={2}>{t("saveBody2")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("propertiesTitle")}
			</Typography>
			<Typography mb={2}>{t("propertiesBody1")}</Typography>
			<Typography mb={2}>{t("propertiesBody2")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("addProgramTitle")}
			</Typography>
			<Typography mb={2}>{t("addProgramBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("exportTitle")}
			</Typography>
			<Typography variant="h5" mb={1}>
				{t("exportSubtitle")}
			</Typography>
			<Typography mb={2}>{t("exportIntro")}</Typography>
			<ManualList items={t.raw("exportFormats") as string[]} />
			<Typography mb={2}>{t("exportScopeIntro")}</Typography>
			<ManualList items={t.raw("exportScopes") as string[]} />
			<Typography mb={2}>{t("exportOutro")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("closeTitle")}
			</Typography>
			<Typography mb={2}>{t("closeBody")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
