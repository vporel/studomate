"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function SimulationSection({ selected }: { selected: string }) {
	const t = useT("manual.simulation");
	const isChild = selected.startsWith("simulation-");
	const show = (id: string) => !isChild || selected === id;

	return (
		<section id="simulation">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			{!isChild && (
				<>
					<Typography variant="h5" mb={1}>
						{t("modesCompareTitle")}
					</Typography>
					<ManualList items={t.raw("modesCompareItems") as string[]} />
				</>
			)}

			{show("simulation-start") && (
				<article id="simulation-start">
					<Typography variant="h3" mb={2}>
						{t("startTitle")}
					</Typography>
					<Typography mb={2}>{t("startIntro")}</Typography>
					<ManualList items={t.raw("startItems") as string[]} />
					<Typography mb={2}>{t("startError")}</Typography>
					<Typography mb={2}>{t("startModesIntro")}</Typography>
					<ManualList items={t.raw("startModes") as string[]} />
					<Typography mb={2}>{t("startTimers")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("simulation-running") && (
				<article id="simulation-running">
					<Typography variant="h3" mb={2}>
						{t("runningTitle")}
					</Typography>
					<ManualList items={t.raw("runningItems") as string[]} />
					<Typography variant="h5" mb={1}>
						{t("cycleOrderTitle")}
					</Typography>
					<Typography mb={1}>{t("cycleOrderIntro")}</Typography>
					<ManualList items={t.raw("cycleOrderItems") as string[]} />
					<Typography mb={2}>{t("cycleOrderOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("simulation-watch-tables") && (
				<article id="simulation-watch-tables">
					<Typography variant="h3" mb={2}>
						{t("watchTitle")}
					</Typography>
					<Typography mb={2}>{t("watchIntro")}</Typography>
					<ManualList items={t.raw("watchItems") as string[]} />
					<Typography mb={2}>{t("watchOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("simulation-stop") && (
				<article id="simulation-stop">
					<Typography variant="h3" mb={2}>
						{t("stopTitle")}
					</Typography>
					<Typography mb={2}>{t("stopBody")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
