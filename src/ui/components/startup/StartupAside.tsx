"use client";

import { Link } from "@/i18n/navigation";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import type { ReactNode } from "react";
import {
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Typography,
} from "@mui/material";

export default function StartupAside() {
	const t = useT("chrome.startup");
	const { locale } = useLocaleContext();
	const resources: {
		href: "/user-manual" | "/training";
		label: string;
		icon: ReactNode;
	}[] = [
		{
			href: "/user-manual",
			label: t("userManual"),
			icon: <MenuBookOutlinedIcon fontSize="small" />,
		},
		{
			href: "/training",
			label: t("training"),
			icon: <SchoolOutlinedIcon fontSize="small" />,
		},
	];

	return (
		<Paper
			component="aside"
			variant="outlined"
			sx={{ borderRadius: 2, py: 1.5, position: "sticky", top: 40 }}
		>
			<Typography
				component="h2"
				variant="overline"
				color="text.secondary"
				sx={{ px: 2 }}
			>
				{t("resources")}
			</Typography>
			<List dense disablePadding>
				{resources.map(({ href, label, icon }) => (
					<ListItemButton
						key={href}
						component={Link}
						href={href}
						locale={locale}
						target="_blank"
						rel="noopener"
					>
						<ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
						<ListItemText primary={label} />
					</ListItemButton>
				))}
			</List>
		</Paper>
	);
}
