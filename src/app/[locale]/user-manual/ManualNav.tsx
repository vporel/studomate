"use client";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
	Box,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Typography,
} from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import type { Locale } from "@/i18n/config";
import { useLocale } from "next-intl";
import NextLink from "next/link";
import React, { useEffect, useState } from "react";
import manualPath from "./manual-path";
import { MANUAL_SECTIONS } from "./manual-sections";

export default function ManualNav({ selected }: { selected?: string }) {
	const t = useT("manual");
	const tNav = useT("manual.nav");
	const locale = useLocale() as Locale;
	const [openMap, setOpenMap] = useState<Record<string, boolean>>(
		() => (selected ? { [selected]: true } : {}),
	);

	useEffect(() => {
		if (!selected) return;
		setOpenMap((m) => ({ ...m, [selected]: true }));
	}, [selected]);

	return (
		<Box sx={{ width: "100%", pr: 2 }}>
			<Typography variant="h6" component="p" gutterBottom>
				{t("navHeading")}
			</Typography>
			<List disablePadding>
				{MANUAL_SECTIONS.map((s) => {
					const hasChildren =
						Array.isArray(s.children) && s.children.length > 0;
					const isOpen = Boolean(openMap[s.id]);

					return (
						<React.Fragment key={s.id}>
							<ListItemButton
								component={NextLink}
								href={manualPath(locale, s.id)!}
								selected={selected === s.id}
								onClick={() => {
									if (hasChildren)
										setOpenMap((m) => ({ ...m, [s.id]: !m[s.id] }));
								}}
							>
								<ListItemText primary={tNav(s.id as never)} />
								{hasChildren && (
									<ListItemIcon sx={{ minWidth: 36 }}>
										{isOpen ? <ExpandLess /> : <ExpandMore />}
									</ListItemIcon>
								)}
							</ListItemButton>

							{hasChildren &&
								isOpen &&
								s.children!.map((c) => (
									<ListItemButton
										key={c}
										component={NextLink}
										href={manualPath(locale, c)!}
										sx={{ pl: 4 }}
									>
										<ListItemText primary={tNav(c as never)} />
									</ListItemButton>
								))}
						</React.Fragment>
					);
				})}
			</List>
		</Box>
	);
}
