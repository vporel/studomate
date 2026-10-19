"use client";

import { useT } from "@/ui/i18n/useT";
import { Typography, type TypographyProps } from "@mui/material";
import type { ProjectContent } from "./project-contents";

export default function ProjectContentsLine({
	contents,
	...typographyProps
}: { contents: ProjectContent[] } & TypographyProps) {
	const t = useT("chrome.startup.contents");
	if (contents.length === 0) return null;
	return (
		<Typography variant="body2" color="text.secondary" {...typographyProps}>
			{contents.map((content) => t(content)).join(" · ")}
		</Typography>
	);
}
