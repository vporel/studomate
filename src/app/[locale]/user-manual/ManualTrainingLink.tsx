"use client";

import type { PublicPathname } from "@/i18n/routing";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";

const TRAINING_LINKS: Record<
	string,
	{ href: PublicPathname; label: "grafcet" | "ladder" | "gettingStarted" }
> = {
	"getting-started": { href: "/training", label: "gettingStarted" },
	grafcet: { href: "/training/a1", label: "grafcet" },
	ladder: { href: "/training/a2", label: "ladder" },
};

/** Link to the training course that teaches the notions of the selected manual section. */
export default function ManualTrainingLink({ selected }: { selected: string }) {
	const t = useT("manual.trainingLinks");
	const sectionId = Object.keys(TRAINING_LINKS).find(
		(id) => selected === id || selected.startsWith(`${id}-`),
	);
	if (!sectionId) return null;
	const link = TRAINING_LINKS[sectionId];

	return (
		<>
			<Divider sx={{ my: 3 }} />
			<Typography>
				<PublicLink href={link.href}>{t(link.label)}</PublicLink>
			</Typography>
		</>
	);
}
