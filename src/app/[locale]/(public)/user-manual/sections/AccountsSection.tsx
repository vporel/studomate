"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function AccountsSection() {
	const t = useT("manual.accounts");
	return (
		<section id="accounts">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("statusTitle")}
			</Typography>
			<Typography mb={2}>{t("statusBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("authTitle")}
			</Typography>
			<Typography mb={2}>{t("authIntro")}</Typography>
			<ManualList items={t.raw("authItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("storageTitle")}
			</Typography>
			<Typography mb={2}>{t("storageBody")}</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("sharingTitle")}
			</Typography>
			<Typography mb={2}>{t("sharingIntro")}</Typography>
			<ManualList items={t.raw("sharingItems") as string[]} />
			<Divider sx={{ my: 2 }} />

			<Typography variant="h4" mb={2}>
				{t("sharingOpenedTitle")}
			</Typography>
			<Typography mb={2}>{t("sharingOpenedBody")}</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
