"use client";

import { useT } from "@/ui/i18n/useT";
import { ManualH2, ManualH3 } from "../manual-heading";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

type LimitsGroup = {
	title: string;
	items: string[];
};

export default function LimitsSection() {
	const t = useT("manual.limits");
	const groups = t.raw("groups") as LimitsGroup[];

	return (
		<section id="limits">
			<Typography variant="h2" component={ManualH2} mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("intro")}</Typography>
			<Divider sx={{ my: 2 }} />
			{groups.map((group) => (
				<div key={group.title}>
					<Typography variant="h4" component={ManualH3} mb={2}>
						{group.title}
					</Typography>
					<ManualList items={group.items} />
					<Divider sx={{ my: 2 }} />
				</div>
			))}
		</section>
	);
}
