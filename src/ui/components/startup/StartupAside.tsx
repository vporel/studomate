"use client";

import routes from "@/app/routes";
import { useT } from "@/ui/i18n/useT";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import {
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Typography,
} from "@mui/material";
import Link from "next/link";

export default function StartupAside() {
	const t = useT("chrome.startup");
	const resources = [
		{
			href: routes.userManual(),
			label: t("userManual"),
			icon: <MenuBookOutlinedIcon fontSize="small" />,
		},
		{
			href: routes.training(),
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
					<ListItemButton key={href} component={Link} href={href}>
						<ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
						<ListItemText primary={label} />
					</ListItemButton>
				))}
			</List>
		</Paper>
	);
}
