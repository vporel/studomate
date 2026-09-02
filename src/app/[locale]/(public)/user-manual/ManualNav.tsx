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
import React, { useEffect, useState } from "react";
import { MANUAL_SECTIONS } from "./manual-sections";

export default function ManualNav({
	selected,
	onSelect,
}: {
	selected?: string;
	onSelect?: (id: string) => void;
}) {
	const t = useT("manual");
	const tNav = useT("manual.nav");
	const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!selected) return;
		// Déplie le parent dont un enfant est sélectionné (ex : lien direct vers une sous-section).
		const parent = MANUAL_SECTIONS.find((s) =>
			s.children?.some((c) => c === selected),
		);
		if (parent) setOpenMap((m) => ({ ...m, [parent.id]: true }));
	}, [selected]);

	return (
		<Box sx={{ width: "100%", pr: 2 }}>
			<Typography variant="h6" gutterBottom>
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
								component="a"
								href={`#${s.id}`}
								selected={selected === s.id}
								onClick={(e) => {
									e.preventDefault();
									onSelect?.(s.id);
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
										component="a"
										href={`#${c}`}
										sx={{ pl: 4 }}
										selected={selected === c}
										onClick={(e) => {
											e.preventDefault();
											onSelect?.(c);
										}}
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
