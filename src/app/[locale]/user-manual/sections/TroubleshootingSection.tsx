"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

type TroubleshootingEntry = {
	title: string;
	intro: string;
	items: string[];
	outro?: string;
};

export default function TroubleshootingSection() {
	const t = useT("manual.troubleshooting");
	const entries = t.raw("entries") as TroubleshootingEntry[];

	return (
		<section id="troubleshooting">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("intro")}</Typography>
			<Divider sx={{ my: 2 }} />
			{entries.map((entry) => (
				<div key={entry.title}>
					<Typography variant="h4" mb={2}>
						{entry.title}
					</Typography>
					<Typography mb={1}>{entry.intro}</Typography>
					<ManualList items={entry.items} />
					{entry.outro && <Typography mb={2}>{entry.outro}</Typography>}
					<Divider sx={{ my: 2 }} />
				</div>
			))}
		</section>
	);
}
