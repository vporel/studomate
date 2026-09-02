"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function AnalysisSection({ selected }: { selected: string }) {
	const t = useT("manual.analysis");
	const isChild = selected.startsWith("analysis-");
	const show = (id: string) => !isChild || selected === id;

	return (
		<section id="analysis">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>

			{show("analysis-run") && (
				<article id="analysis-run">
					<Typography variant="h3" mb={2}>
						{t("runTitle")}
					</Typography>
					<Typography mb={2}>{t("runIntro")}</Typography>
					<ManualList items={t.raw("runItems") as string[]} />
					<Typography mb={2}>{t("runOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("analysis-checks") && (
				<article id="analysis-checks">
					<Typography variant="h3" mb={2}>
						{t("checksTitle")}
					</Typography>
					<ManualList items={t.raw("checksItems") as string[]} />
					<Typography mb={2}>{t("checksOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("analysis-messages") && (
				<article id="analysis-messages">
					<Typography variant="h3" mb={2}>
						{t("messagesTitle")}
					</Typography>
					<Typography mb={1}>{t("messagesIntro")}</Typography>
					<ManualList items={t.raw("messagesItems") as string[]} />
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
