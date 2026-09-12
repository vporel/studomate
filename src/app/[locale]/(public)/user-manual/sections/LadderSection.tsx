"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function LadderSection({ selected }: { selected: string }) {
	const t = useT("manual.ladder");
	const isChild = selected.startsWith("ladder-");
	const show = (id: string) => !isChild || selected === id;

	return (
		<section id="ladder">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>
			<Typography mb={2}>{t("p2")}</Typography>
			<Typography mb={2}>{t("p3")}</Typography>

			{show("ladder-sections") && (
				<article id="ladder-sections">
					<Typography variant="h3" mb={2}>
						{t("sectionsTitle")}
					</Typography>
					<Typography mb={2}>{t("sectionsIntro")}</Typography>
					<ManualList items={t.raw("sectionsItems") as string[]} />
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("ladder-contacts") && (
				<article id="ladder-contacts">
					<Typography variant="h3" mb={2}>
						{t("contactsTitle")}
					</Typography>
					<Typography mb={2}>{t("contactsIntro")}</Typography>
					<ManualList items={t.raw("contactsItems") as string[]} />
					<Typography mb={2}>{t("contactsOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("ladder-coils") && (
				<article id="ladder-coils">
					<Typography variant="h3" mb={2}>
						{t("coilsTitle")}
					</Typography>
					<Typography mb={2}>{t("coilsIntro")}</Typography>
					<ManualList items={t.raw("coilsItems") as string[]} />
					<Typography mb={2}>{t("coilsOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("ladder-blocks") && (
				<article id="ladder-blocks">
					<Typography variant="h3" mb={2}>
						{t("blocksTitle")}
					</Typography>
					<Typography mb={2}>{t("blocksIntro1")}</Typography>
					<Typography mb={2}>{t("blocksIntro2")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("timerTitle")}
					</Typography>
					<Typography mb={2}>{t("timerIntro")}</Typography>
					<ManualList items={t.raw("timerItems") as string[]} />
					<Typography mb={2}>{t("timerOutro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("counterTitle")}
					</Typography>
					<Typography mb={2}>{t("counterIntro")}</Typography>
					<ManualList items={t.raw("counterItems") as string[]} />
					<Typography mb={2}>{t("counterOutro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("compareTitle")}
					</Typography>
					<Typography mb={2}>{t("compareBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("assignTitle")}
					</Typography>
					<Typography mb={2}>{t("assignBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("calcTitle")}
					</Typography>
					<Typography mb={2}>{t("calcBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("programCallTitle")}
					</Typography>
					<Typography mb={2}>{t("programCallBody")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("ladder-connections") && (
				<article id="ladder-connections">
					<Typography variant="h3" mb={2}>
						{t("connectionsTitle")}
					</Typography>
					<Typography mb={2}>{t("connectionsIntro")}</Typography>
					<ManualList items={t.raw("connectionsItems") as string[]} />
					<Typography mb={2}>{t("connectionsMenu")}</Typography>
					<Typography mb={2}>{t("connectionsSim")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
