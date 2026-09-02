"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function GrafcetSection({ selected }: { selected: string }) {
	const t = useT("manual.grafcet");
	const isChild = selected.startsWith("grafcet-");
	const show = (id: string) => !isChild || selected === id;

	return (
		<section id="grafcet">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>

			{show("grafcet-canvas") && (
				<article id="grafcet-canvas">
					<Typography variant="h3" mb={2}>
						{t("canvasTitle")}
					</Typography>
					<Typography mb={2}>{t("canvasIntro")}</Typography>
					<ManualList items={t.raw("canvasItems") as string[]} />
					<Typography mb={2}>{t("canvasOutro1")}</Typography>
					<Typography mb={2}>{t("canvasOutro2")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-steps") && (
				<article id="grafcet-steps">
					<Typography variant="h3" mb={2}>
						{t("stepsTitle")}
					</Typography>
					<Typography mb={2}>{t("stepsIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("stepsTypesTitle")}
					</Typography>
					<ManualList items={t.raw("stepsTypes") as string[]} />
					<Typography variant="h5" mb={1}>
						{t("stepsPropsTitle")}
					</Typography>
					<ManualList items={t.raw("stepsProps") as string[]} />
					<Typography mb={2}>{t("stepsBody1")}</Typography>
					<Typography mb={2}>{t("stepsBody2")}</Typography>
					<Typography mb={2}>{t("stepsBody3")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-transitions") && (
				<article id="grafcet-transitions">
					<Typography variant="h3" mb={2}>
						{t("transitionsTitle")}
					</Typography>
					<Typography mb={2}>{t("transitionsIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("transitionsReceptivityTitle")}
					</Typography>
					<Typography mb={2}>{t("transitionsReceptivityBody")}</Typography>
					<ManualList items={t.raw("transitionsItems") as string[]} />
					<Typography mb={2}>{t("transitionsOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-actions") && (
				<article id="grafcet-actions">
					<Typography variant="h3" mb={2}>
						{t("actionsTitle")}
					</Typography>
					<Typography mb={2}>{t("actionsIntro")}</Typography>
					<Divider sx={{ my: 1 }} />
					<Typography variant="h5" mb={1}>
						{t("actionsTypesTitle")}
					</Typography>
					<ManualList items={t.raw("actionsTypes") as string[]} />
					<Typography mb={2}>{t("actionsTypeChange")}</Typography>
					<Divider sx={{ my: 1 }} />
					<Typography variant="h5" mb={1}>
						{t("actionsModesTitle")}
					</Typography>
					<ManualList items={t.raw("actionsModes") as string[]} />
					<Typography mb={2}>{t("actionsModeChange")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-junctions") && (
				<article id="grafcet-junctions">
					<Typography variant="h3" mb={2}>
						{t("junctionsTitle")}
					</Typography>
					<Typography mb={2}>{t("junctionsIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("junctionsTypesTitle")}
					</Typography>
					<ManualList items={t.raw("junctionsTypes") as string[]} />
					<Typography variant="h5" mb={1}>
						{t("junctionsBranchesTitle")}
					</Typography>
					<Typography mb={2}>{t("junctionsBranchesIntro")}</Typography>
					<ManualList items={t.raw("junctionsBranches") as string[]} />
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-referrals") && (
				<article id="grafcet-referrals">
					<Typography variant="h3" mb={2}>
						{t("referralsTitle")}
					</Typography>
					<Typography mb={2}>{t("referralsIntro")}</Typography>
					<ManualList items={t.raw("referralsItems") as string[]} />
					<Typography mb={2}>{t("referralsOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-comments") && (
				<article id="grafcet-comments">
					<Typography variant="h3" mb={2}>
						{t("commentsTitle")}
					</Typography>
					<Typography mb={2}>{t("commentsBody1")}</Typography>
					<Typography mb={2}>{t("commentsBody2")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("grafcet-connections") && (
				<article id="grafcet-connections">
					<Typography variant="h3" mb={2}>
						{t("connectionsTitle")}
					</Typography>
					<Typography mb={2}>{t("connectionsIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("connectionsCreateTitle")}
					</Typography>
					<Typography mb={2}>{t("connectionsCreateBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("connectionsRulesTitle")}
					</Typography>
					<Typography mb={2}>{t("connectionsRulesIntro")}</Typography>
					<ManualList items={t.raw("connectionsRules") as string[]} />
					<Typography variant="h5" mb={1}>
						{t("connectionsWaypointsTitle")}
					</Typography>
					<Typography mb={2}>{t("connectionsWaypointsBody")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
