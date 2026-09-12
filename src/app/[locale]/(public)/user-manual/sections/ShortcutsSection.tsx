"use client";

import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

export default function ShortcutsSection() {
	const t = useT("manual.shortcuts");
	const group = (
		titleKey: string,
		itemsKey: string,
	): [string, string[]] => [t(titleKey), t.raw(itemsKey) as string[]];

	const groups = [
		group("fileTitle", "fileItems"),
		group("projectTitle", "projectItems"),
		group("editTitle", "editItems"),
		group("explorerTitle", "explorerItems"),
		group("inlineTitle", "inlineItems"),
	];

	return (
		<section id="shortcuts">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("intro")}</Typography>
			<Divider sx={{ my: 2 }} />
			{groups.map(([title, items]) => (
				<div key={title}>
					<Typography variant="h4" mb={2}>
						{title}
					</Typography>
					<ManualList items={items} />
					<Divider sx={{ my: 2 }} />
				</div>
			))}
		</section>
	);
}
